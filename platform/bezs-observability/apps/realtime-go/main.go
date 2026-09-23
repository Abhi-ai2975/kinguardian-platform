// main is the composition root for the realtime service.
// It wires together all layers — adapters, use cases, handlers — and starts
// the server. Nothing outside main.go should know about concrete implementations.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"

	"watcher24/realtime/config"
	postgresadapter "watcher24/realtime/internal/adapters/postgres"
	redisadapter "watcher24/realtime/internal/adapters/redis"
	"watcher24/realtime/internal/transport"
	"watcher24/realtime/internal/transport/handlers"
	"watcher24/realtime/internal/usecases"
)

func main() {
	// Load .env in local development — ignored if file is absent (production).
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()

	// ── Adapters ──────────────────────────────────────────────────────────────

	redisSubscriber, err := redisadapter.NewSubscriberAdapter(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis subscriber: %v", err)
	}
	defer redisSubscriber.Close() //nolint:errcheck

	keyValidator, err := postgresadapter.NewKeyValidatorAdapter(ctx, cfg.IAMDatabaseURL)
	if err != nil {
		log.Fatalf("key validator: %v", err)
	}
	defer keyValidator.Close()

	// ── Use Cases ─────────────────────────────────────────────────────────────

	authUC := usecases.NewAuthenticateConnectionUseCase(keyValidator)

	// ── Transport ─────────────────────────────────────────────────────────────

	hub := transport.NewHub(redisSubscriber)
	wsHandler := handlers.NewWSHandler(authUC, hub)
	healthHandler := handlers.NewHealthHandler(redisSubscriber, keyValidator)

	app := transport.NewServer(transport.RouteHandlers{
		WSUpgrade:    wsHandler.Upgrade,
		WSHandle:     wsHandler.Handle,
		HealthHandle: healthHandler.Handle,
	})

	// ── Graceful shutdown ─────────────────────────────────────────────────────

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("shutting down realtime service...")
		if err := app.Shutdown(); err != nil {
			log.Printf("shutdown error: %v", err)
		}
	}()

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("realtime service listening on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("listen: %v", err)
	}
}
