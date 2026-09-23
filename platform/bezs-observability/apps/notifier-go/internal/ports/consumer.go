// consumer.go defines the stream consumer port for reading from stream:notify.
// The Redis adapter implements this; the use case and worker depend only on
// this interface, never on go-redis directly.
package ports

import "context"

// StreamMessage is a single message read from stream:notify.
type StreamMessage struct {
	ID     string         // Redis stream message ID, used to ACK
	Fields map[string]any // raw key-value pairs from the stream entry
}

// StreamConsumer is the port for reading messages from a Redis Stream.
// Implemented by the Redis adapter; consumed by the notify worker goroutine.
type StreamConsumer interface {
	// ReadBatch reads up to batchSize messages from the consumer group.
	// Blocks up to blockMs milliseconds when the stream is empty.
	ReadBatch(ctx context.Context, batchSize int, blockMs int) ([]*StreamMessage, error)

	// Ack acknowledges processed messages so they are not re-delivered.
	Ack(ctx context.Context, ids ...string) error

	// ClaimPending takes ownership of messages that have been pending
	// (unACK'd) for at least minIdleMs — used on startup to recover
	// from a previous crash without losing messages.
	ClaimPending(ctx context.Context, batchSize int, minIdleMs int) ([]*StreamMessage, error)
}
