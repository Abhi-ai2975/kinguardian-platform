// pubsub.go implements the NotificationPubSub port using Redis pub/sub.
// Publish writes a lightweight signal to "notifications:{orgID}".
// Subscribe reads from that channel and forwards messages to a Go channel
// that is closed when the context is cancelled.
package redis

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// PubSubAdapter implements ports.NotificationPubSub using Redis pub/sub.
// A separate Redis client is used so the SSE subscriber goroutines do not
// share a connection with the stream consumer, avoiding head-of-line blocking.
type PubSubAdapter struct {
	client *redis.Client
}

// NewPubSubAdapter creates a Redis pub/sub adapter and verifies connectivity.
func NewPubSubAdapter(ctx context.Context, redisURL string) (*PubSubAdapter, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("pubsub: parse url: %w", err)
	}
	client := redis.NewClient(opts)
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("pubsub: ping: %w", err)
	}
	return &PubSubAdapter{client: client}, nil
}

// Close releases the Redis connection pool.
func (a *PubSubAdapter) Close() error {
	return a.client.Close()
}

// notificationSignal is the constant payload published on every in-app write.
// Consumers must re-fetch from the REST API for the actual notification data.
const notificationSignal = `{"type":"notification"}`

// Publish sends a notification signal to "notifications:{orgID}".
func (a *PubSubAdapter) Publish(ctx context.Context, orgID string) error {
	return a.client.Publish(ctx, "notifications:"+orgID, notificationSignal).Err()
}

// Subscribe opens a Redis pub/sub subscription for "notifications:{orgID}".
// Returns a channel that receives a byte slice for each published signal.
// The channel is closed when ctx is cancelled or the subscription fails.
func (a *PubSubAdapter) Subscribe(ctx context.Context, orgID string) (<-chan []byte, error) {
	sub := a.client.Subscribe(ctx, "notifications:"+orgID)

	// Receive blocks until the subscription is confirmed by Redis.
	if _, err := sub.Receive(ctx); err != nil {
		_ = sub.Close()
		return nil, fmt.Errorf("pubsub: subscribe %s: %w", orgID, err)
	}

	out := make(chan []byte, 16)

	go func() {
		defer close(out)
		defer sub.Close() //nolint:errcheck

		msgCh := sub.Channel()
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-msgCh:
				if !ok {
					return
				}
				select {
				case out <- []byte(msg.Payload):
				default:
					// Drop rather than block if the SSE writer is slow.
				}
			}
		}
	}()

	return out, nil
}
