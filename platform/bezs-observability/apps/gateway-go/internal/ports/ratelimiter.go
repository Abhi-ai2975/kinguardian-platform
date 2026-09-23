// Package ports defines the interface contracts that use cases and transport
// layers depend on. Concrete implementations live in the adapters layer.
package ports

import "context"

// MinuteRateLimiter enforces per-minute event caps for public tokens.
//
// Only invoked for requests authenticated with a public token (KeyTypePublic).
// Secret API keys skip this check entirely.
//
// The interface exists so the transport layer can be tested without a live
// Redis connection — tests inject a fake that always allows or always blocks.
type MinuteRateLimiter interface {
	// Allow increments the counter for this key's current minute window and
	// returns nil if the request is within the cap. Returns domain.ErrMinuteRateExceeded
	// if the cap has been reached. Implementations must fail open on infrastructure
	// errors so a Redis outage never blocks legitimate browser events.
	Allow(ctx context.Context, keyID string, limitPerMinute int64) error
}
