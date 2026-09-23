// Package redis implements the StreamConsumer and DedupStore ports using go-redis.
//
// The StreamConsumer reads from stream:notify using a consumer group (cg:notify).
// The DedupStore uses Redis SETNX with TTL to prevent duplicate alert deliveries.
package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"watcher24/notifier/internal/ports"
)

const (
	streamName    = "stream:notify"
	groupName     = "cg:notify"
	consumerName  = "notifier"
)

// StreamConsumerAdapter implements ports.StreamConsumer for stream:notify.
type StreamConsumerAdapter struct {
	client *redis.Client
}

// NewStreamConsumerAdapter creates the Redis client, verifies connectivity,
// and ensures the consumer group exists (creating it if the stream is new).
func NewStreamConsumerAdapter(ctx context.Context, redisURL string) (*StreamConsumerAdapter, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("notify consumer: parse url: %w", err)
	}

	client := redis.NewClient(opts)
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("notify consumer: ping: %w", err)
	}

	// Create the consumer group if it doesn't exist.
	// "$" means only consume messages arriving after this startup.
	// MKSTREAM creates the stream if it doesn't exist yet.
	err = client.XGroupCreateMkStream(ctx, streamName, groupName, "$").Err()
	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		return nil, fmt.Errorf("notify consumer: create group: %w", err)
	}

	return &StreamConsumerAdapter{client: client}, nil
}

// Ping checks Redis connectivity. Used by the health handler.
func (a *StreamConsumerAdapter) Ping(ctx context.Context) error {
	return a.client.Ping(ctx).Err()
}

// Close releases the Redis client connection.
func (a *StreamConsumerAdapter) Close() error {
	return a.client.Close()
}

// Client exposes the underlying redis.Client so main.go can share it with the
// DedupStoreAdapter rather than opening a second connection to Redis.
func (a *StreamConsumerAdapter) Client() *redis.Client {
	return a.client
}

// ReadBatch reads up to batchSize messages from the stream:notify consumer group.
// Blocks up to blockMs milliseconds when the stream is empty.
func (a *StreamConsumerAdapter) ReadBatch(ctx context.Context, batchSize int, blockMs int) ([]*ports.StreamMessage, error) {
	results, err := a.client.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    groupName,
		Consumer: consumerName,
		Streams:  []string{streamName, ">"},
		Count:    int64(batchSize),
		Block:    time.Duration(blockMs) * time.Millisecond,
	}).Result()

	if err != nil {
		if err == redis.Nil {
			return nil, nil // stream empty during block window
		}
		return nil, fmt.Errorf("notify consumer: xreadgroup: %w", err)
	}

	var out []*ports.StreamMessage
	for _, stream := range results {
		for _, msg := range stream.Messages {
			out = append(out, &ports.StreamMessage{
				ID:     msg.ID,
				Fields: msg.Values,
			})
		}
	}
	return out, nil
}

// Ack acknowledges processed messages so they are removed from the pending list.
func (a *StreamConsumerAdapter) Ack(ctx context.Context, ids ...string) error {
	if len(ids) == 0 {
		return nil
	}
	return a.client.XAck(ctx, streamName, groupName, ids...).Err()
}

// ClaimPending takes ownership of messages pending for at least minIdleMs.
// Called once at startup to recover messages left unACK'd by a previous crash.
func (a *StreamConsumerAdapter) ClaimPending(ctx context.Context, batchSize int, minIdleMs int) ([]*ports.StreamMessage, error) {
	// XAutoClaim returns (messages, nextCursor, error) — we ignore the cursor
	// because we always start from "0" and only want one batch on startup.
	msgs, _, err := a.client.XAutoClaim(ctx, &redis.XAutoClaimArgs{
		Stream:   streamName,
		Group:    groupName,
		Consumer: consumerName,
		MinIdle:  time.Duration(minIdleMs) * time.Millisecond,
		Start:    "0",
		Count:    int64(batchSize),
	}).Result()

	if err != nil {
		return nil, fmt.Errorf("notify consumer: autoclaim: %w", err)
	}

	var out []*ports.StreamMessage
	for _, msg := range msgs {
		out = append(out, &ports.StreamMessage{
			ID:     msg.ID,
			Fields: msg.Values,
		})
	}
	return out, nil
}

// ── DedupStore ────────────────────────────────────────────────────────────────

// DedupStoreAdapter implements ports.DedupStore using Redis SETNX with TTL.
type DedupStoreAdapter struct {
	client *redis.Client
}

// NewDedupStoreAdapter creates a DedupStoreAdapter reusing an existing Redis client.
func NewDedupStoreAdapter(client *redis.Client) *DedupStoreAdapter {
	return &DedupStoreAdapter{client: client}
}

// IsDuplicate returns true when the dedup key is already set in Redis.
func (a *DedupStoreAdapter) IsDuplicate(ctx context.Context, dedupKey string) (bool, error) {
	exists, err := a.client.Exists(ctx, "dedup:"+dedupKey).Result()
	if err != nil {
		return false, fmt.Errorf("dedup check: %w", err)
	}
	return exists > 0, nil
}

// SetSeen records a dedup key with the given TTL in seconds.
func (a *DedupStoreAdapter) SetSeen(ctx context.Context, dedupKey string, ttlSeconds int) error {
	return a.client.Set(ctx, "dedup:"+dedupKey, "1", time.Duration(ttlSeconds)*time.Second).Err()
}
