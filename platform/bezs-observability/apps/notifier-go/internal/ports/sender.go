// Package ports defines the interfaces (contracts) that the use cases depend on.
// Adapters implement these interfaces; use cases only import this package, never
// the adapter packages directly — enforcing the clean architecture dependency rule.
package ports

import (
	"context"

	"watcher24/notifier/internal/domain"
)

// Sender is the port for delivering a notification to a single channel.
// Each channel (email, in-app, Slack, etc.) has its own adapter that
// implements this interface. The use case dispatches to the right sender
// based on the channel type — it never calls SMTP or HTTP directly.
type Sender interface {
	// Send delivers the rendered message to the channel.
	// Returns an error if delivery failed (the caller handles retry logic).
	Send(ctx context.Context, req *domain.NotificationRequest, msg *domain.RenderedMessage) error

	// Channel returns which channel this sender handles.
	// Used by the use case dispatcher to route to the correct sender.
	Channel() domain.Channel
}
