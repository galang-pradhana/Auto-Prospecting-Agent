package api

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gosom/google-maps-scraper/log"
)

type trackRequest struct {
	Token    string `json:"token"`
	Duration int    `json:"duration"`
}

type updateQueueRequest struct {
	Status string    `json:"status"`
	SentAt *time.Time `json:"sent_at"`
}

func redirectHandler(appState *AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := chi.URLParam(r, "token")
		if token == "" {
			http.Error(w, "missing token", http.StatusBadRequest)
			return
		}

		prospectID, slug, err := appState.Store.GetLeadByToken(r.Context(), token)
		if err != nil {
			log.Error("failed to get lead by token", "error", err, "token", token)
			http.Error(w, "invalid token", http.StatusNotFound)
			return
		}

		// Log event
		_ = appState.Store.LogProspectEvent(r.Context(), prospectID, "link_clicked", nil)

		// Redirect to live site
		baseURL := os.Getenv("LIVE_SITE_BASE_URL")
		if baseURL == "" {
			baseURL = "http://localhost:3000" // fallback
		}
		targetURL := baseURL + "/" + slug
		http.Redirect(w, r, targetURL, http.StatusFound)
	}
}

func trackHandler(appState *AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req trackRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		if req.Token == "" {
			http.Error(w, "missing token", http.StatusBadRequest)
			return
		}

		// [RISK-3 FIX] Reject zero, negative, or absurdly large durations.
		// Beacon script fires every 5s, so anything > 60s per call is suspicious.
		const maxBeaconDuration = 60
		if req.Duration <= 0 {
			http.Error(w, "duration must be a positive integer", http.StatusBadRequest)
			return
		}
		if req.Duration > maxBeaconDuration {
			log.Warn("beacon duration exceeds max cap, clamping", "received", req.Duration, "capped_to", maxBeaconDuration)
			req.Duration = maxBeaconDuration
		}

		prospectID, _, err := appState.Store.GetLeadByToken(r.Context(), req.Token)
		if err != nil {
			http.Error(w, "invalid token", http.StatusNotFound)
			return
		}

		// Update engagement and check for qualification
		qualified, err := appState.Store.UpdateLeadEngagement(r.Context(), prospectID, req.Duration)
		if err != nil {
			log.Error("failed to update lead engagement", "error", err, "prospect_id", prospectID)
		}

		if qualified {
			_ = appState.Store.LogProspectEvent(r.Context(), prospectID, "qualified", nil)
		}

		// Always log the beacon
		_ = appState.Store.LogProspectEvent(r.Context(), prospectID, "time_beacon", map[string]interface{}{
			"duration": req.Duration,
		})

		w.WriteHeader(http.StatusNoContent)
	}
}

func updateQueueStatusHandler(appState *AppState) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		itemID := chi.URLParam(r, "id")
		if itemID == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}

		var req updateQueueRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		err := appState.Store.UpdateFollowupQueueStatus(r.Context(), itemID, req.Status, req.SentAt)
		if err != nil {
			log.Error("failed to update queue status", "error", err, "id", itemID)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		// If sent, log the event
		if req.Status == "sent" {
			// Note: In a real scenario we'd fetch the prospect_id first to log the event correctly.
			// For now we assume the update is enough or we log a generic system event.
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}
}
