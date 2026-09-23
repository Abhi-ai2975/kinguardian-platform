// Package redis implements the EventPublisher port using Redis Streams.
//
// Redis Streams (XADD) are used as the queue layer between the gateway and
// the Python workers. Each event type has its own stream topic so workers
// can specialize (e.g. the audit worker only reads stream:audit).
//
// Events are serialized as flat string maps (Redis Streams require string
// field/value pairs) — the payload is JSON-encoded as a single string field.
package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"watcher24/gateway/internal/domain"
)

// PublisherAdapter implements ports.EventPublisher using go-redis/v9.
type PublisherAdapter struct {
	client *redis.Client
}

// NewPublisherAdapter parses the Redis URL, creates the client, and verifies
// connectivity. Returns an error if Redis is unreachable at startup.
func NewPublisherAdapter(ctx context.Context, redisURL string) (*PublisherAdapter, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("redis publisher: parse url: %w", err)
	}

	client := redis.NewClient(opts)

	// Fail fast — discover connectivity issues at startup, not mid-request.
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis publisher: ping: %w", err)
	}

	return &PublisherAdapter{client: client}, nil
}

// Ping checks the Redis connection is alive.
// Used by the health check handler.
func (p *PublisherAdapter) Ping(ctx context.Context) error {
	return p.client.Ping(ctx).Err()
}

// Close shuts down the Redis client connection pool.
func (p *PublisherAdapter) Close() error {
	return p.client.Close()
}

// Publish implements ports.EventPublisher.
// Serializes the event to a Redis Streams map and appends it to the
// correct stream topic via XADD. The stream auto-creates if it doesn't exist.
// Also publishes to a per-org pub/sub channel so the realtime service can
// fan out events to connected WebSocket clients without reading from streams.
func (p *PublisherAdapter) Publish(ctx context.Context, event *domain.Event) error {
	fields, err := eventToStreamFields(event)
	if err != nil {
		return fmt.Errorf("redis publisher: serialize: %w", err)
	}

	// XADD <topic> * <field> <value> ...
	// "*" tells Redis to auto-generate a monotonic stream ID.
	if err := p.client.XAdd(ctx, &redis.XAddArgs{
		Stream: event.EventType.StreamTopic(),
		ID:     "*",
		Values: fields,
	}).Err(); err != nil {
		return fmt.Errorf("redis publisher: xadd: %w", err)
	}

	// PUBLISH events:{org_id} {event_json}
	// Best-effort — realtime fan-out is not critical path; don't fail the
	// ingest request if pub/sub delivery fails.
	if b, err := json.Marshal(event); err == nil {
		_ = p.client.Publish(ctx, "events:"+event.OrganizationID, b).Err()
	}

	return nil
}

// PublishBatch implements ports.EventPublisher.
// Uses a Redis pipeline to send all XADDs and PUBLISHes in a single round-trip,
// significantly reducing latency for batch requests.
func (p *PublisherAdapter) PublishBatch(ctx context.Context, events []*domain.Event) error {
	pipe := p.client.Pipeline()

	for _, event := range events {
		fields, err := eventToStreamFields(event)
		if err != nil {
			return fmt.Errorf("redis publisher: batch serialize: %w", err)
		}

		pipe.XAdd(ctx, &redis.XAddArgs{
			Stream: event.EventType.StreamTopic(),
			ID:     "*",
			Values: fields,
		})

		// Pub/sub for realtime fan-out — best-effort, same as single Publish.
		if b, err := json.Marshal(event); err == nil {
			pipe.Publish(ctx, "events:"+event.OrganizationID, b)
		}
	}

	// Execute all XADDs and PUBLISHes in a single network round-trip.
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("redis publisher: batch exec: %w", err)
	}

	return nil
}

// eventToStreamFields converts a domain.Event into the flat string map
// format required by Redis Streams. All values must be strings.
//
// The payload (arbitrary JSON) is encoded as a single JSON string field
// so it can be decoded by the Python workers on the other side.
func eventToStreamFields(event *domain.Event) (map[string]any, error) {
	payloadJSON := "{}"
	if event.Payload != nil {
		b, err := json.Marshal(event.Payload)
		if err != nil {
			return nil, fmt.Errorf("marshal payload: %w", err)
		}
		payloadJSON = string(b)
	}

	return map[string]any{
		"organization_id": event.OrganizationID,
		"application_id":  event.ApplicationID,
		"environment":     event.Environment,
		"event_type":      string(event.EventType),
		"severity":        string(event.Severity),
		"message":         event.Message,
		"timestamp":       event.Timestamp.Format(time.RFC3339Nano),
		"ingested_at":     event.IngestedAt.Format(time.RFC3339Nano),
		"trace_id":        event.TraceID,
		"span_id":         event.SpanID,
		"parent_span_id":  event.ParentSpanID,
		"user_id":         event.UserID,
		"session_id":      event.SessionID,
		"payload":         payloadJSON,
		"source":          event.Source,
		"service_name":    event.ServiceName,
		"ip_address":      event.IPAddress,
		"sdk_version":     event.SDKVersion,
		"runtime":         event.Runtime,
		"region":          event.Region,
	}, nil
}
