// Package domain — see event.go for package description.
package domain

import "time"

// KeyType classifies the API key for gateway enforcement.
// "secret" keys are server-only; "public" keys may be embedded in browser
// bundles but face stricter enforcement (origin allowlist, write-only, rate-limited).
type KeyType string

const (
	KeyTypeSecret KeyType = "secret"
	KeyTypePublic KeyType = "public"
)

// APIKey represents a validated API key with its resolved organizational context.
// This is the result of a successful key validation — the gateway uses it to
// attach organization_id to every event that key submits.
type APIKey struct {
	// ID is the primary key in the IAM apikey table.
	ID string

	// OrganizationID is the referenceId from the IAM apikey table.
	// This is the org that owns the key and will own all events submitted with it.
	OrganizationID string

	// AppID is the application this key is scoped to, resolved from the apikey row.
	// Empty for legacy org-scoped keys that predate the multi-app feature.
	// When non-empty, the gateway uses it instead of the SDK-supplied x-app-id header.
	AppID string

	// Permissions is an optional JSON-encoded list of allowed actions.
	// nil means unrestricted (all event types accepted).
	Permissions *string

	// ExpiresAt is nil for non-expiring keys.
	ExpiresAt *time.Time

	// EventLimitPerMonth is the maximum number of events the org may ingest in
	// one calendar month, resolved from their active subscription plan.
	// -1 means unlimited (enterprise). Defaults to 100_000 (free tier).
	EventLimitPerMonth int64

	// KeyType distinguishes browser-safe public tokens from server-side secret keys.
	// The gateway enforces different security rules for each type.
	KeyType KeyType

	// AllowedOrigins is the CORS origin allowlist for public tokens.
	// Empty for secret keys (not checked). For public tokens, requests whose
	// Origin header is not in this list are rejected with 403.
	AllowedOrigins []string

	// MinuteRateLimit is the per-minute event cap for public tokens.
	// Not enforced for secret keys. The gateway uses Redis INCR+EXPIRE
	// to enforce this limit so damage from a leaked public token is bounded.
	MinuteRateLimit int64
}

// ErrAPIKeyNotFound is returned when no key matches the provided hash.
var ErrAPIKeyNotFound = domainError("api key not found")

// ErrAPIKeyDisabled is returned when the key exists but enabled=false.
var ErrAPIKeyDisabled = domainError("api key is disabled")

// ErrAPIKeyExpired is returned when the key's expiresAt is in the past.
var ErrAPIKeyExpired = domainError("api key has expired")

// ErrEventLimitExceeded is returned when the org has consumed their monthly event quota.
var ErrEventLimitExceeded = domainError("monthly event limit exceeded")

// ErrOriginNotAllowed is returned when a public token's Origin header is not in its
// AllowedOrigins list. This is the primary security boundary for public tokens —
// it prevents a leaked token from being used from any site the owner didn't authorise.
var ErrOriginNotAllowed = domainError("origin not in allowlist")

// ErrMinuteRateExceeded is returned when a public token's per-minute event cap
// has been reached. This bounds the damage if a public token leaks.
var ErrMinuteRateExceeded = domainError("per-minute rate limit exceeded")

// domainError is a simple typed error for domain-level failures.
// Using a named type lets callers do errors.Is() checks without importing
// error libraries.
type domainError string

func (e domainError) Error() string { return string(e) }
