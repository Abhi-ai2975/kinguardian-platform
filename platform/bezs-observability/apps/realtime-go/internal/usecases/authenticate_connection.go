// Package usecases contains the business logic for the realtime service.
// Use cases depend only on port interfaces — never on adapters directly.
package usecases

import (
	"context"
	"errors"
	"fmt"

	"watcher24/realtime/internal/ports"
)

// AuthenticateConnectionUseCase validates a raw API key and returns the
// organisation ID the key belongs to. This is the only use case in the
// realtime service — all connection lifecycle logic lives in the transport
// layer since it is inherently tied to WebSocket I/O.
type AuthenticateConnectionUseCase struct {
	validator ports.KeyValidator
}

// NewAuthenticateConnectionUseCase constructs the use case with its dependency.
func NewAuthenticateConnectionUseCase(v ports.KeyValidator) *AuthenticateConnectionUseCase {
	return &AuthenticateConnectionUseCase{validator: v}
}

// Execute validates the raw key. Returns the orgID on success, or a typed
// error that callers can map to the appropriate HTTP/WebSocket response.
func (uc *AuthenticateConnectionUseCase) Execute(ctx context.Context, rawKey string) (string, error) {
	if rawKey == "" {
		return "", ErrMissingAPIKey
	}

	key, err := uc.validator.Validate(ctx, rawKey)
	if err != nil {
		if errors.Is(err, ports.ErrAPIKeyNotFound) ||
			errors.Is(err, ports.ErrAPIKeyDisabled) ||
			errors.Is(err, ports.ErrAPIKeyExpired) {
			return "", ErrUnauthorized
		}
		return "", fmt.Errorf("authenticate connection: %w", err)
	}

	return key.OrganizationID, nil
}

var (
	// ErrMissingAPIKey is returned when no key was provided in the request.
	ErrMissingAPIKey = errors.New("missing api key")
	// ErrUnauthorized is returned when the key is invalid, disabled, or expired.
	ErrUnauthorized = errors.New("unauthorized")
)
