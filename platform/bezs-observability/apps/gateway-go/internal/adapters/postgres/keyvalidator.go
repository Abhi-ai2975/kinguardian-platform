// Package postgres implements the KeyValidator port using the IAM PostgreSQL database.
//
// The IAM service (better-auth) stores API keys hashed with SHA-256 in the
// `apikey` table of the `iam` database. This adapter connects to that same
// database (read-only queries only) to validate incoming SDK requests.
//
// The gateway never writes to the IAM database — it only reads the apikey table.
package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"watcher24/gateway/internal/domain"
)

// KeyValidatorAdapter implements ports.KeyValidator using pgx to query
// the IAM database's apikey table.
type KeyValidatorAdapter struct {
	// pool is a pgx connection pool to the IAM database.
	// Using a pool (not a single connection) ensures concurrent requests
	// don't block each other waiting for a database connection.
	pool *pgxpool.Pool
}

// NewKeyValidatorAdapter creates the adapter and verifies the DB connection
// is reachable. Returns an error if the pool cannot be established.
func NewKeyValidatorAdapter(ctx context.Context, databaseURL string) (*KeyValidatorAdapter, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("postgres key validator: create pool: %w", err)
	}

	// Fail fast at startup — don't wait for the first request to discover
	// the database is unreachable.
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("postgres key validator: ping: %w", err)
	}

	return &KeyValidatorAdapter{pool: pool}, nil
}

// Ping checks the database connection is still alive.
// Used by the health check handler.
func (a *KeyValidatorAdapter) Ping(ctx context.Context) error {
	return a.pool.Ping(ctx)
}

// Close releases all connections in the pool.
// Should be called on graceful shutdown.
func (a *KeyValidatorAdapter) Close() {
	a.pool.Close()
}

// Validate implements ports.KeyValidator.
//
// It hashes the raw key, looks up the apikey row, and resolves the
// organization ID. better-auth stores either a user ID or an org ID in
// referenceId depending on how the key was created:
//   - Org-scoped key (created inside an org context): referenceId = org ID → used directly.
//   - User-scoped key (created without an org context): referenceId = user ID →
//     resolved to the user's activeOrganizationId via a LEFT JOIN on userContext.
//
// This ensures events are always tagged with an org ID so the console
// dashboard queries match, even when the API key was created without an
// explicit org context.
func (a *KeyValidatorAdapter) Validate(ctx context.Context, rawKey string) (*domain.APIKey, error) {
	hash := hashKey(rawKey)

	var (
		id              string
		referenceID     string
		activeOrgID     *string // non-nil when referenceId is a user with an active org
		appID           *string // non-nil when the key is scoped to a specific application
		enabled         bool
		expiresAt       *time.Time
		permissions     *string
		eventLimit      int64
		keyType         string
		allowedOrigins  []string
		minuteRateLimit int64
	)

	// LEFT JOIN userContext so that when referenceId is a user ID we can
	// resolve their activeOrganizationId in one round-trip.
	// The correlated subquery resolves the org's active subscription plan →
	// event limit in the same query, defaulting to 100_000 (free tier).
	//
	// keyType, allowedOrigins, and minuteRateLimit are the public token fields
	// added to the IAM Prisma schema. They are present on all rows with safe
	// defaults ("secret", [], 1000) so the query always returns valid values.
	err := a.pool.QueryRow(ctx,
		`SELECT a.id, a."referenceId", a.enabled, a."expiresAt", a.permissions,
		        uc."activeOrganizationId",
		        a.app_id,
		        COALESCE(
		          (
		            SELECT CASE s.plan
		                     WHEN 'enterprise' THEN -1
		                     WHEN 'pro'        THEN 5000000
		                     ELSE                   100000
		                   END
		            FROM subscription s
		            INNER JOIN member m ON m."userId" = s."referenceId"
		            WHERE m."organizationId" = COALESCE(uc."activeOrganizationId", a."referenceId")
		              AND s.status IN ('active', 'trialing')
		            ORDER BY CASE s.plan
		                       WHEN 'enterprise' THEN 1
		                       WHEN 'pro'        THEN 2
		                       ELSE                   3
		                     END
		            LIMIT 1
		          ),
		          100000
		        ) AS event_limit,
		        COALESCE(a."keyType", 'secret') AS key_type,
		        COALESCE(a."allowedOrigins", '{}') AS allowed_origins,
		        COALESCE(a."minuteRateLimit", 1000) AS minute_rate_limit
		 FROM apikey a
		 LEFT JOIN "userContext" uc ON uc."userId" = a."referenceId"
		 WHERE a.key = $1
		 LIMIT 1`,
		hash,
	).Scan(&id, &referenceID, &enabled, &expiresAt, &permissions, &activeOrgID, &appID, &eventLimit, &keyType, &allowedOrigins, &minuteRateLimit)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAPIKeyNotFound
		}
		return nil, fmt.Errorf("postgres key validator: query: %w", err)
	}

	if !enabled {
		return nil, domain.ErrAPIKeyDisabled
	}

	if expiresAt != nil && time.Now().UTC().After(*expiresAt) {
		return nil, domain.ErrAPIKeyExpired
	}

	// Resolve the organization ID: prefer the user's active org when the key
	// is user-scoped (LEFT JOIN matched), otherwise use referenceId directly
	// (already an org ID for org-scoped keys, or user ID as last resort).
	orgID := referenceID
	if activeOrgID != nil && *activeOrgID != "" {
		orgID = *activeOrgID
	}

	resolvedAppID := ""
	if appID != nil {
		resolvedAppID = *appID
	}

	return &domain.APIKey{
		ID:                 id,
		OrganizationID:     orgID,
		AppID:              resolvedAppID,
		Permissions:        permissions,
		ExpiresAt:          expiresAt,
		EventLimitPerMonth: eventLimit,
		KeyType:            domain.KeyType(keyType),
		AllowedOrigins:     allowedOrigins,
		MinuteRateLimit:    minuteRateLimit,
	}, nil
}

// hashKey returns the SHA-256 base64url digest of the raw API key (no padding).
// better-auth's @better-auth/api-key plugin stores keys hashed with
// SHA-256 encoded as base64url (not hex) — this must match exactly.
func hashKey(rawKey string) string {
	sum := sha256.Sum256([]byte(rawKey))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}
