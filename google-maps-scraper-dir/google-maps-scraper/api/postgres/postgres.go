package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/gosom/google-maps-scraper/api"
	"github.com/gosom/google-maps-scraper/cryptoext"
	"github.com/gosom/google-maps-scraper/log"
)

var (
	ErrAPIKeyNotFound = errors.New("api key not found")
	ErrAPIKeyRevoked  = errors.New("api key has been revoked")
)

type store struct {
	db *pgxpool.Pool
}

// New creates a new API store.
func New(db *pgxpool.Pool) api.IStore {
	return &store{db: db}
}

// ValidateAPIKey validates an API key and returns the key info.
func (s *store) ValidateAPIKey(ctx context.Context, key string) (int, string, error) { //nolint:gocritic // unnamedResult: return types match IStore interface signature exactly
	keyHash := cryptoext.Sha256Hash(key)

	var id int

	var name string

	var revokedAt *time.Time

	err := s.db.QueryRow(ctx,
		`SELECT id, name, revoked_at
		 FROM api_keys WHERE key_hash = $1`,
		keyHash,
	).Scan(&id, &name, &revokedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, "", ErrAPIKeyNotFound
		}

		return 0, "", err
	}

	if revokedAt != nil {
		return 0, "", ErrAPIKeyRevoked
	}

	now := time.Now().UTC()
	oneMinAgo := now.Add(-1 * time.Minute)

	_, err = s.db.Exec(ctx, `UPDATE api_keys
		SET last_used_at = $1
		WHERE id = $2 AND (last_used_at IS NULL OR last_used_at < $3)`,
		now, id, oneMinAgo,
	)
	if err != nil {
		log.Warn("failed to update api key last_used_at", "error", err, "api_key_id", id)
	}

	return id, name, nil
}

func (s *store) GetLeadByToken(ctx context.Context, token string) (string, string, error) {
	var prospectID, slug string
	err := s.db.QueryRow(ctx,
		`SELECT t.prospect_id, p.slug
		 FROM tracking_tokens t
		 JOIN prospects p ON t.prospect_id = p.id
		 WHERE t.token = $1`,
		token,
	).Scan(&prospectID, &slug)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", "", errors.New("token not found")
		}
		return "", "", err
	}
	return prospectID, slug, nil
}

func (s *store) LogProspectEvent(ctx context.Context, prospectID string, eventType string, metadata map[string]interface{}) error {
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return err
	}

	_, err = s.db.Exec(ctx,
		`INSERT INTO prospect_events (prospect_id, event_type, metadata, created_at)
		 VALUES ($1, $2, $3, NOW())`,
		prospectID, eventType, metadataJSON,
	)
	return err
}

func (s *store) UpdateLeadEngagement(ctx context.Context, prospectID string, duration int) (bool, error) {
	var qualifiedAt *time.Time
	var totalTime int

	// Update total time and get current state
	err := s.db.QueryRow(ctx,
		`UPDATE prospects
		 SET total_time_on_page = total_time_on_page + $1,
		     updated_at = NOW()
		 WHERE id = $2
		 RETURNING qualified_at, total_time_on_page`,
		duration, prospectID,
	).Scan(&qualifiedAt, &totalTime)

	if err != nil {
		return false, err
	}

	// Trigger qualification if threshold met
	if qualifiedAt == nil && totalTime >= 10 {
		_, err = s.db.Exec(ctx,
			`UPDATE prospects
			 SET qualified_at = NOW(),
			     followup_stage = 'qualified',
			     updated_at = NOW()
			 WHERE id = $1`,
			prospectID,
		)
		if err != nil {
			return false, err
		}
		return true, nil
	}

	return qualifiedAt != nil, nil
}

func (s *store) UpdateFollowupQueueStatus(ctx context.Context, itemID string, status string, sentAt *time.Time) error {
	_, err := s.db.Exec(ctx,
		`UPDATE followup_queue
		 SET status = $1,
		     sent_at = $2
		 WHERE id = $3`,
		status, sentAt, itemID,
	)
	return err
}

// followupRow is an internal struct for scanning prospect candidates during scheduler runs.
type followupRow struct {
	ID           string
	Name         string
	City         string
	Category     string
	Phone        string
	CurrentCount int
	QualifiedAt  *time.Time
}

func (s *store) ProcessFollowups(ctx context.Context, renderFn func(int, api.ProspectData) string, linkFn func(string, string) string) error {
	rows, err := s.db.Query(ctx,
		`SELECT id, name, city, category, wa, followup_count, qualified_at
		 FROM prospects
		 WHERE followup_stage IN ('sent', 'clicked', 'qualified')
		   AND next_followup_at <= NOW()
		   AND followup_count < 4`,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	var candidates []followupRow
	for rows.Next() {
		var r followupRow
		if err := rows.Scan(&r.ID, &r.Name, &r.City, &r.Category, &r.Phone, &r.CurrentCount, &r.QualifiedAt); err != nil {
			continue
		}
		candidates = append(candidates, r)
	}
	// Explicitly close rows before starting transactions to release the connection.
	rows.Close()

	for _, c := range candidates {
		nextCount := c.CurrentCount + 1

		// Logic check for WA #2 — only queue if qualified
		if nextCount == 2 && c.QualifiedAt == nil {
			continue
		}

		// [RISK-1 FIX] Each candidate is processed in its own transaction.
		// We use SELECT FOR UPDATE SKIP LOCKED to acquire a row-level lock on
		// the prospect. If another goroutine (e.g., concurrent scheduler tick or
		// dashboard action) is already processing this prospect, we skip it
		// gracefully instead of racing.
		tx, err := s.db.Begin(ctx)
		if err != nil {
			log.Error("ProcessFollowups: failed to begin tx", "prospect_id", c.ID, "error", err)
			continue
		}

		var lockedID string
		err = tx.QueryRow(ctx,
			`SELECT id FROM prospects
			 WHERE id = $1
			 FOR UPDATE SKIP LOCKED`,
			c.ID,
		).Scan(&lockedID)
		if err != nil {
			// Row is locked by another goroutine — skip gracefully
			tx.Rollback(ctx)
			log.Warn("ProcessFollowups: prospect locked by another process, skipping", "prospect_id", c.ID)
			continue
		}

		// [RISK-1 FIX] Idempotency guard: check if a queue entry for this
		// prospect+followup_number already exists (pending or sent).
		// This prevents duplicate queue entries if the scheduler fires twice
		// within the same window (e.g., after a restart).
		var existingCount int
		err = tx.QueryRow(ctx,
			`SELECT COUNT(*) FROM followup_queue
			 WHERE prospect_id = $1
			   AND followup_number = $2
			   AND status IN ('pending', 'sent')`,
			c.ID, nextCount,
		).Scan(&existingCount)
		if err != nil || existingCount > 0 {
			tx.Rollback(ctx)
			if existingCount > 0 {
				log.Info("ProcessFollowups: queue entry already exists, skipping", "prospect_id", c.ID, "followup_number", nextCount)
			}
			continue
		}

		msg := renderFn(nextCount, api.ProspectData{Name: c.Name, City: c.City, BusinessType: c.Category})
		waLink := linkFn(c.Phone, msg)

		// Insert to queue
		_, err = tx.Exec(ctx,
			`INSERT INTO followup_queue (prospect_id, followup_number, message_text, wa_link, status, queued_at)
			 VALUES ($1, $2, $3, $4, 'pending', NOW())`,
			c.ID, nextCount, msg, waLink,
		)
		if err != nil {
			tx.Rollback(ctx)
			log.Error("ProcessFollowups: failed to insert queue", "prospect_id", c.ID, "error", err)
			continue
		}

		// Update lead counters
		var nextFollowupAt *time.Time
		stageUpdate := ""
		if nextCount < 4 {
			t := time.Now().AddDate(0, 0, 7)
			nextFollowupAt = &t
		} else {
			stageUpdate = ", followup_stage = 'closed_lost'"
		}

		query := fmt.Sprintf(`UPDATE prospects SET followup_count = $1, next_followup_at = $2 %s WHERE id = $3`, stageUpdate)
		_, err = tx.Exec(ctx, query, nextCount, nextFollowupAt, c.ID)
		if err != nil {
			tx.Rollback(ctx)
			log.Error("ProcessFollowups: failed to update prospect", "prospect_id", c.ID, "error", err)
			continue
		}

		// Log event
		_, err = tx.Exec(ctx,
			`INSERT INTO prospect_events (prospect_id, event_type, metadata)
			 VALUES ($1, 'followup_queued', $2)`,
			c.ID, map[string]interface{}{"followup_number": nextCount},
		)
		if err != nil {
			tx.Rollback(ctx)
			log.Error("ProcessFollowups: failed to log event", "prospect_id", c.ID, "error", err)
			continue
		}

		if err := tx.Commit(ctx); err != nil {
			log.Error("ProcessFollowups: commit failed", "prospect_id", c.ID, "error", err)
		} else {
			log.Info("ProcessFollowups: queued follow-up", "prospect_id", c.ID, "followup_number", nextCount)
		}
	}

	return nil
}


// Ensure store implements api.IStore.
var _ api.IStore = (*store)(nil)
