// pubsub.go defines the port for real-time notification signalling.
// After writing an in-app notification to PostgreSQL, the use case publishes
// a lightweight signal so that SSE subscribers can invalidate their cache
// without waiting for the next poll interval.
package ports

import "context"

// NotificationPubSub is the port for publishing and subscribing to real-time
// notification signals using Redis pub/sub under "notifications:{orgID}".
// The payload is intentionally minimal — consumers should re-fetch from the
// REST API to get actual notification data. This is a signal, not a payload.
type NotificationPubSub interface {
	// Publish emits a notification signal for orgID.
	Publish(ctx context.Context, orgID string) error

	// Subscribe returns a channel that receives a message for every new
	// notification signal published for orgID.
	// The channel is closed when ctx is cancelled.
	Subscribe(ctx context.Context, orgID string) (<-chan []byte, error)
}
