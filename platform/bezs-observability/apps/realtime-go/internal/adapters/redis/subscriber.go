// Package redis implements the EventSubscriber port using Redis pub/sub.
// The gateway publishes events to "events:{orgID}" channels after each XADD.
// This adapter subscribes to those channels and forwards raw JSON to callers.
package redis

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// SubscriberAdapter implements ports.EventSubscriber using go-redis pub/sub.
type SubscriberAdapter struct {
	client *redis.Client
}

// NewSubscriberAdapter parses the Redis URL and verifies connectivity.
func NewSubscriberAdapter(ctx context.Context, redisURL string) (*SubscriberAdapter, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("redis subscriber: parse url: %w", err)
	}

	client := redis.NewClient(opts)
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis subscriber: ping: %w", err)
	}

	return &SubscriberAdapter{client: client}, nil
}

// Ping checks Redis connectivity. Used by the health handler.
func (s *SubscriberAdapter) Ping(ctx context.Context) error {
	return s.client.Ping(ctx).Err()
}

// Close releases the Redis client connection pool.
func (s *SubscriberAdapter) Close() error {
	return s.client.Close()
}

// Subscribe opens a pub/sub subscription for "events:{orgID}".
// Returns a channel that receives raw event JSON as messages arrive.
// The channel is closed when ctx is cancelled or the subscription fails.
// Each call creates a new subscription — the hub calls this once per active org.
func (s *SubscriberAdapter) Subscribe(ctx context.Context, orgID string) (<-chan []byte, error) {
	channel := "events:" + orgID
	sub := s.client.Subscribe(ctx, channel)

	// Verify the subscription was accepted before returning.
	if _, err := sub.Receive(ctx); err != nil {
		_ = sub.Close()
		return nil, fmt.Errorf("redis subscriber: subscribe %s: %w", channel, err)
	}

	out := make(chan []byte, 64)

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
					// Drop event rather than block if the consumer is slow.
					// The dashboard can tolerate missed events — it is a live view,
					// not a reliable delivery channel.
				}
			}
		}
	}()

	return out, nil
}
