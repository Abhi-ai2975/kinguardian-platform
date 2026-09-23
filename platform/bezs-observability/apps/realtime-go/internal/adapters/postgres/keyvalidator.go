// Package postgres implements the KeyValidator port using pgx/v5.
// This is a read-only adapter — it only queries the IAM database.
// The query and hashing logic mirrors the gateway exactly so API keys
// are accepted consistently across both services.
package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"watcher24/realtime/internal/ports"
)

// KeyValidatorAdapter implements ports.KeyValidator against the IAM PostgreSQL database.
type KeyValidatorAdapter struct {
	pool *pgxpool.Pool
}

// NewKeyValidatorAdapter creates the connection pool and verifies connectivity.
func NewKeyValidatorAdapter(ctx context.Context, dsn string) (*KeyValidatorAdapter, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("postgres key validator: connect: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("postgres key validator: ping: %w", err)
	}
	return &KeyValidatorAdapter{pool: pool}, nil
}

// Ping checks the database connection is alive. Used by the health handler.
func (a *KeyValidatorAdapter) Ping(ctx context.Context) error {
	return a.pool.Ping(ctx)
}

// Close releases all pool connections.
func (a *KeyValidatorAdapter) Close() {
	a.pool.Close()
}

// Validate hashes the raw key with SHA-256 (base64url, no padding — matches
// better-auth storage) and queries the IAM `apikey` table.
// LEFT JOINs userContext to resolve the active org ID for user-scoped keys,
// mirroring the same logic in the gateway so WebSocket connections are
// scoped to the correct organization.
func (a *KeyValidatorAdapter) Validate(ctx context.Context, rawKey string) (*ports.APIKey, error) {
	hash := hashKey(rawKey)

	var (
		id          string
		referenceID string
		activeOrgID *string
		enabled     bool
		expiresAt   *time.Time
	)

	err := a.pool.QueryRow(ctx,
		`SELECT a.id, a."referenceId", a.enabled, a."expiresAt",
		        uc."activeOrganizationId"
		 FROM apikey a
		 LEFT JOIN "userContext" uc ON uc."userId" = a."referenceId"
		 WHERE a.key = $1
		 LIMIT 1`,
		hash,
	).Scan(&id, &referenceID, &enabled, &expiresAt, &activeOrgID)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ports.ErrAPIKeyNotFound
		}
		return nil, fmt.Errorf("postgres key validator: query: %w", err)
	}

	if !enabled {
		return nil, ports.ErrAPIKeyDisabled
	}
	if expiresAt != nil && time.Now().After(*expiresAt) {
		return nil, ports.ErrAPIKeyExpired
	}

	// Prefer the user's active org over referenceId directly (which may be
	// a user ID for keys created outside an org context).
	orgID := referenceID
	if activeOrgID != nil && *activeOrgID != "" {
		orgID = *activeOrgID
	}

	return &ports.APIKey{
		ID:             id,
		OrganizationID: orgID,
	}, nil
}

// hashKey returns the SHA-256 base64url digest (no padding) of the raw API key.
// better-auth stores keys hashed this way — must match exactly.
func hashKey(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}
