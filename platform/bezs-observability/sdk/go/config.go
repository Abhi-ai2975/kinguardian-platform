// config.go — ClientOptions definition and defaults.
// All configuration for the Watcher24 client lives here so callers have a
// single place to look up every tunable parameter.
package watcher

import (
	"fmt"
	"runtime"
	"time"
)

const (
	defaultGatewayURL    = "https://ingest.watcher24.io"
	defaultEnvironment   = "production"
	defaultFlushInterval = 500 * time.Millisecond
	defaultFlushAt       = 100
	defaultMaxBuffer     = 10_000
	sdkVersion           = "0.1.0"
)

// ClientOptions configures the Watcher24 client.
// Only APIKey is required; all other fields have sensible defaults that work
// for most production deployments.
type ClientOptions struct {
	// APIKey is the Watcher24 API key (required).
	// Use a secret key (wtch_... prefix) for server-side Go applications.
	// Public tokens (wpub_... prefix) are for browser SDKs only.
	APIKey string

	// AppID links every event from this client to a specific registered
	// application in the Watcher24 dashboard. Optional — if omitted, events
	// are visible at the organisation level but not scoped to an app.
	AppID string

	// ServiceName is a human-readable label for this service component
	// (e.g. "payment-api", "worker", "cron"). Sent as X-Service-Name.
	// Useful when multiple services share a single API key.
	ServiceName string

	// Environment labels events by deployment stage (default: "production").
	// Common values: "production", "staging", "development".
	Environment string

	// GatewayURL is the base URL of the ingestion gateway (no trailing slash).
	// Default: https://ingest.watcher24.io
	// Override for self-hosted deployments or local development.
	GatewayURL string

	// FlushInterval controls how often the background goroutine sends buffered
	// events. Default: 500ms. Lower values reduce latency at the cost of more
	// HTTP requests; higher values improve throughput.
	FlushInterval time.Duration

	// FlushAt is the number of buffered events that triggers an immediate flush
	// before the next timer tick. Default: 100.
	// Tune this alongside FlushInterval for your event volume.
	FlushAt int

	// MaxBuffer is the maximum number of events held in memory between flushes.
	// When full, the oldest event is silently dropped to make room.
	// Default: 10,000. Raise this if your service produces short bursts faster
	// than the gateway can accept.
	MaxBuffer int
}

// applyDefaults fills in zero-value fields and validates required fields.
// Called by NewClient before any other setup.
func (o *ClientOptions) applyDefaults() error {
	if o.APIKey == "" {
		return fmt.Errorf("watcher: APIKey is required")
	}
	if o.Environment == "" {
		o.Environment = defaultEnvironment
	}
	if o.GatewayURL == "" {
		o.GatewayURL = defaultGatewayURL
	}
	if o.FlushInterval <= 0 {
		o.FlushInterval = defaultFlushInterval
	}
	if o.FlushAt <= 0 {
		o.FlushAt = defaultFlushAt
	}
	if o.MaxBuffer <= 0 {
		o.MaxBuffer = defaultMaxBuffer
	}
	return nil
}

// runtimeLabel returns the Go runtime version string sent in the X-Runtime
// header so the gateway can log which SDK runtime produced each batch.
func runtimeLabel() string {
	return "go/" + runtime.Version()
}
