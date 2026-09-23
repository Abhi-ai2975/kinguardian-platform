// Package ports — KeyValidator mirrors the same port used in the gateway.
// The realtime service validates API keys on WebSocket upgrade using the
// same IAM database query so keys are accepted consistently across services.
package ports

import (
	"context"
	"errors"
)

// APIKey carries the org context resolved from a raw API key.
type APIKey struct {
	ID             string
	OrganizationID string
}

var (
	// ErrAPIKeyNotFound is returned when the key does not exist in IAM.
	ErrAPIKeyNotFound = errors.New("api key not found")
	// ErrAPIKeyDisabled is returned when the key exists but is disabled.
	ErrAPIKeyDisabled = errors.New("api key disabled")
	// ErrAPIKeyExpired is returned when the key's expiry has passed.
	ErrAPIKeyExpired = errors.New("api key expired")
)

// KeyValidator is the port for validating raw API keys against the IAM database.
// Depends on an interface rather than a concrete Postgres implementation so
// the use case can be unit-tested without a live database.
type KeyValidator interface {
	// Validate hashes the raw key and looks it up in IAM.
	// Returns the resolved APIKey or a typed error.
	Validate(ctx context.Context, rawKey string) (*APIKey, error)
}
