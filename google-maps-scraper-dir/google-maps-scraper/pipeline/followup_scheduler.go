package pipeline

import (
	"context"
	"time"

	"github.com/gosom/google-maps-scraper/api"
	"github.com/gosom/google-maps-scraper/log"
)

// StartFollowupScheduler starts an hourly cron job to process prospect follow-ups.
func StartFollowupScheduler(ctx context.Context, store api.IStore) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	log.Info("Starting follow-up scheduler (hourly)")

	// Run once immediately
	process(ctx, store)

	for {
		select {
		case <-ctx.Done():
			log.Info("Stopping follow-up scheduler")
			return
		case <-ticker.C:
			process(ctx, store)
		}
	}
}

func process(ctx context.Context, store api.IStore) {
	log.Info("Running follow-up processing cycle")
	
	err := store.ProcessFollowups(ctx, RenderTemplate, BuildWaLink)
	if err != nil {
		log.Error("Follow-up processing failed", "error", err)
	}
}
