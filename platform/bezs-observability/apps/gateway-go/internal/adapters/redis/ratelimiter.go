// ratelimiter.go implements the MinuteRateLimiter port using Redis INCR + EXPIRE.
//
// Each public token gets one Redis key per minute window, keyed by:
//
//	rate:pub:{keyID}:{unix_minute}
//
// The counter is atomically incremented on every request. If the count exceeds
// the token's cap, the gateway returns 429. The key expires after 2 minutes so
// Redis never accumulates unbounded stale counters.
package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"watcher24/gateway/internal/domain"
)

// RateLimiterAdapter implements ports.MinuteRateLimiter using Redis INCR+EXPIRE.
type RateLimiterAdapter struct {
	client *redis.Client
}

// NewRateLimiterAdapter connects to Redis and returns the adapter.
// Accepts the same redisURL as the publisher adapter — in production they
// connect to the same Redis instance via separate connection pools.
func NewRateLimiterAdapter(ctx context.Context, redisURL string) (*RateLimiterAdapter, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("redis rate limiter: parse url: %w", err)
	}

	client := redis.NewClient(opts)
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis rate limiter: ping: %w", err)
	}

	return &RateLimiterAdapter{client: client}, nil
}

// Close releases the Redis connection pool.
func (r *RateLimiterAdapter) Close() error {
	return r.client.Close()
}

// Allow implements ports.MinuteRateLimiter.
//
// Uses INCR to atomically increment the counter and EXPIRE to set a 2-minute TTL
// on the first increment. The TTL ensures keys expire automatically even if the
// gateway crashes mid-request without ever hitting the limit.
//
// Fails open on Redis errors — a rate-limiter outage must never block valid browser events.
func (r *RateLimiterAdapter) Allow(ctx context.Context, keyID string, limitPerMinute int64) error {
	minute := time.Now().Unix() / 60
	rkey := fmt.Sprintf("rate:pub:%s:%d", keyID, minute)

	count, err := r.client.Incr(ctx, rkey).Result()
	if err != nil {
		// Fail open — Redis downtime should not block legitimate browser traffic.
		return nil
	}

	// Set the TTL only on the first increment so subsequent calls don't reset
	// the expiry and inadvertently extend the window.
	if count == 1 {
		_ = r.client.Expire(ctx, rkey, 2*time.Minute).Err()
	}

	if count > limitPerMinute {
		return domain.ErrMinuteRateExceeded
	}
	return nil
}
