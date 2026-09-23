// Package ports defines the interfaces this service depends on.
// Use cases import these interfaces, never the concrete adapter implementations.
package ports

import "context"

// EventSubscriber is the port for subscribing to live events for one org.
// The realtime service depends on this interface rather than a concrete Redis
// implementation so the hub can be tested with a fake subscriber.
type EventSubscriber interface {
	// Subscribe opens a pub/sub subscription for the given orgID.
	// Returns a channel that yields raw event JSON as events arrive.
	// The channel is closed when ctx is cancelled.
	Subscribe(ctx context.Context, orgID string) (<-chan []byte, error)
}
