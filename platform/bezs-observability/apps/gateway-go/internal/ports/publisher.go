// Package ports — see keyvalidator.go for package description.
package ports

import (
	"context"

	"watcher24/gateway/internal/domain"
)

// EventPublisher is the contract for publishing events to the queue layer.
//
// In production this is implemented by the Redis Streams adapter.
// In tests it can be replaced with an in-memory publisher that records
// which events were published, letting use case tests assert on behaviour
// without needing a real Redis instance.
type EventPublisher interface {
	// Publish sends a single event to the appropriate Redis Stream topic
	// based on the event's EventType.
	//
	// Returns an error if the queue is unreachable or the write fails.
	// The caller (use case) is responsible for deciding whether to retry.
	Publish(ctx context.Context, event *domain.Event) error

	// PublishBatch sends multiple events in a single operation.
	// Events may be of different types — the publisher routes each one
	// to the correct stream topic independently.
	//
	// Returns an error if any event fails to publish. On partial failure,
	// already-published events are not rolled back (best-effort delivery).
	PublishBatch(ctx context.Context, events []*domain.Event) error
}
