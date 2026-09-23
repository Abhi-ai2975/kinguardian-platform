// main.go is the composition root for the gateway service.
//
// This is the ONLY place in the codebase where concrete implementations
// are instantiated and injected. All other layers depend on interfaces
// (ports) — this file wires the real adapters to those interfaces.
//
// Startup order:
//   1. Load config from environment
//   2. Connect to infrastructure (Postgres, Redis)
//   3. Create adapters (implement ports)
//   4. Create use cases (inject adapters via port interfaces)
//   5. Create handlers (inject use cases)
//   6. Build and start HTTP server
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"watcher24/gateway/config"
	chadapter "watcher24/gateway/internal/adapters/clickhouse"
	geoadapter "watcher24/gateway/internal/adapters/geoip"
	pgadapter "watcher24/gateway/internal/adapters/postgres"
	redisadapter "watcher24/gateway/internal/adapters/redis"
	"watcher24/gateway/internal/transport"
	"watcher24/gateway/internal/transport/handlers"
	"watcher24/gateway/internal/usecases"
)

func main() {
	ctx := context.Background()

	// ── 1. Load configuration ─────────────────────────────────────────────────
	cfg := config.Load()
	log.Printf("gateway: starting in %s mode on :%s", cfg.Env, cfg.Port)

	// ── 2. Connect to infrastructure ─────────────────────────────────────────
	// Postgres — used only for API key validation against the IAM database
	pgAdapter, err := pgadapter.NewKeyValidatorAdapter(ctx, cfg.IAMDatabaseURL)
	if err != nil {
		log.Fatalf("gateway: failed to connect to IAM database: %v", err)
	}
	defer pgAdapter.Close()
	log.Println("gateway: connected to IAM database")

	// Redis — publisher: writes events to streams consumed by the Python workers
	redisAdapter, err := redisadapter.NewPublisherAdapter(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatalf("gateway: failed to connect to Redis (publisher): %v", err)
	}
	defer redisAdapter.Close()
	log.Println("gateway: connected to Redis (publisher)")

	// Redis — rate limiter: enforces per-minute caps for public browser tokens
	rateLimiterAdapter, err := redisadapter.NewRateLimiterAdapter(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatalf("gateway: failed to connect to Redis (rate limiter): %v", err)
	}
	defer rateLimiterAdapter.Close()
	log.Println("gateway: connected to Redis (rate limiter)")

	// ClickHouse — used to count monthly events for plan limit enforcement
	chAdapter := chadapter.NewLimitCheckerAdapter(
		cfg.ClickhouseURL,
		cfg.ClickhouseUser,
		cfg.ClickhousePassword,
		cfg.ClickhouseDB,
	)
	log.Println("gateway: clickhouse limit checker ready")

	// ── 3. Create use cases (inject adapters via port interfaces) ────────────
	// Use cases receive the adapter through the port interface, so they
	// have no knowledge of Redis or Postgres — only the contracts.
	ingestUC := usecases.NewIngestEventUseCase(redisAdapter, chAdapter)

	// ── 4. Create adapters (continued) ───────────────────────────────────────
	// GeoIP resolver — resolves client IPs to ISO alpha-2 country codes.
	// Uses ip-api.com with a 24-hour in-memory cache; private IPs are skipped.
	geoResolver := geoadapter.NewHTTPGeoResolver()
	log.Println("gateway: geo resolver ready")

	// ── 5. Create handlers ────────────────────────────────────────────────────
	eventsHandler := handlers.NewEventsHandler(ingestUC, rateLimiterAdapter, geoResolver, cfg.DefaultCountry)
	healthHandler := handlers.NewHealthHandler(redisAdapter, pgAdapter)

	// ── 6. Build server ───────────────────────────────────────────────────────
	// pgAdapter implements both ports.KeyValidator and HealthChecker.
	server := transport.NewServer(pgAdapter, eventsHandler, healthHandler)

	// ── 7. Start with graceful shutdown ───────────────────────────────────────
	// Run the server in a goroutine so we can listen for OS signals.
	go func() {
		if err := server.Start(":" + cfg.Port); err != nil {
			log.Printf("gateway: server stopped: %v", err)
		}
	}()

	log.Printf("gateway: listening on :%s", cfg.Port)

	// Block until SIGINT (Ctrl+C) or SIGTERM (Docker/Kubernetes stop).
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("gateway: shutting down gracefully...")
	if err := server.Shutdown(); err != nil {
		log.Printf("gateway: shutdown error: %v", err)
	}
	log.Println("gateway: stopped")
}
