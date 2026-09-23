// Package ports defines the interface contracts that use cases depend on.
// These are pure interfaces — no implementations live here.
//
// The purpose of this layer is to invert dependencies: use cases declare
// what they need (the interface), and adapters provide the implementation.
// This means use cases can be tested without any real infrastructure.
package ports

import (
	"context"

	"watcher24/gateway/internal/domain"
)

// KeyValidator is the contract for validating SDK API keys.
//
// The gateway depends on this interface rather than a concrete Postgres
// implementation so that:
//   - Unit tests can inject a fake validator (no DB required)
//   - The underlying store can be swapped (e.g. add Redis cache) without
//     touching any use case code
type KeyValidator interface {
	// Validate accepts a raw API key (e.g. "wtch_abc123..."), hashes it,
	// and looks it up in the IAM database.
	//
	// Returns:
	//   - *domain.APIKey with org context on success
	//   - domain.ErrAPIKeyNotFound if the key does not exist
	//   - domain.ErrAPIKeyDisabled if the key is disabled
	//   - domain.ErrAPIKeyExpired if the key has passed its expiry
	//   - a wrapped infrastructure error for DB failures
	Validate(ctx context.Context, rawKey string) (*domain.APIKey, error)
}
