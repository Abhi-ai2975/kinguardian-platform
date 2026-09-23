// Package config loads all runtime configuration for the notifier service.
// All values come from environment variables. The Config struct is passed
// through the composition root — no global variables anywhere else.
package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds every runtime setting for notifier-go.
// Each field maps to an env var documented in docs/configuration.md.
type Config struct {
	// Port is the HTTP port this service listens on (default: "4004").
	Port string

	// Env is the deployment environment: development, staging, production.
	Env string

	// InternalSecret is the shared secret that callers (console, IAM) must
	// supply in the X-Internal-Secret header to reach the trigger endpoint.
	// Never expose this value — it authenticates internal service-to-service calls.
	InternalSecret string

	// DatabaseURL is the connection string for the watcher24 PostgreSQL database.
	// Notifier reads notification_channels and writes notification_deliveries
	// and in_app_notifications to this database.
	DatabaseURL string

	// RedisURL is the Redis connection string.
	// Used to consume stream:notify and to store dedup/idempotency keys.
	RedisURL string

	// SMTP settings — used by the EmailSender adapter.
	// Phase 1 uses Gmail SMTP. Phase 2 will swap to Resend.
	SMTPHost     string
	SMTPPort     string
	SMTPEmail    string // the authenticated sender address
	SMTPPassword string
	SMTPFromName string

	// ChannelsEnabled is a comma-separated list of active channels.
	// Phase 1 default: "email,in_app". Slack/webhook/pagerduty added later.
	ChannelsEnabled string
}

// Load reads environment variables and returns a populated Config.
// Attempts to load .env from the project root first; falls back to
// the process environment in Docker/Kubernetes.
func Load() *Config {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("notifier: no .env file found, reading from environment")
	}

	return &Config{
		Port:            getEnv("NOTIFIER_PORT", "4004"),
		Env:             getEnv("NOTIFIER_ENV", "development"),
		InternalSecret:  getEnv("NOTIFIER_INTERNAL_SECRET", "change-me"),
		DatabaseURL:     getEnv("WATCHER24_DATABASE_URL", "postgresql://watcher:watcher_secret@localhost:5433/watcher24"),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379"),
		SMTPHost:        getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:        getEnv("SMTP_PORT", "587"),
		SMTPEmail:       getEnv("SMTP_EMAIL", ""),
		SMTPPassword:    getEnv("SMTP_PASS", ""),
		SMTPFromName:    getEnv("SMTP_FROM_NAME", "Watcher24"),
		ChannelsEnabled: getEnv("CHANNELS_ENABLED", "email,in_app"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
