package usecases_test

import (
	"context"
	"errors"
	"testing"

	"watcher24/realtime/internal/ports"
	"watcher24/realtime/internal/usecases"
)

// fakeValidator is a test double for ports.KeyValidator.
type fakeValidator struct {
	key *ports.APIKey
	err error
}

func (f *fakeValidator) Validate(_ context.Context, _ string) (*ports.APIKey, error) {
	return f.key, f.err
}

func TestAuthenticateConnection_ValidKey_ReturnsOrgID(t *testing.T) {
	uc := usecases.NewAuthenticateConnectionUseCase(&fakeValidator{
		key: &ports.APIKey{ID: "key_1", OrganizationID: "org_abc"},
	})

	orgID, err := uc.Execute(context.Background(), "wtch_valid")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if orgID != "org_abc" {
		t.Errorf("expected org_abc, got %s", orgID)
	}
}

func TestAuthenticateConnection_EmptyKey_ReturnsErrMissingAPIKey(t *testing.T) {
	uc := usecases.NewAuthenticateConnectionUseCase(&fakeValidator{})

	_, err := uc.Execute(context.Background(), "")

	if !errors.Is(err, usecases.ErrMissingAPIKey) {
		t.Errorf("expected ErrMissingAPIKey, got %v", err)
	}
}

func TestAuthenticateConnection_KeyNotFound_ReturnsErrUnauthorized(t *testing.T) {
	uc := usecases.NewAuthenticateConnectionUseCase(&fakeValidator{err: ports.ErrAPIKeyNotFound})

	_, err := uc.Execute(context.Background(), "wtch_bad")

	if !errors.Is(err, usecases.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got %v", err)
	}
}

func TestAuthenticateConnection_KeyDisabled_ReturnsErrUnauthorized(t *testing.T) {
	uc := usecases.NewAuthenticateConnectionUseCase(&fakeValidator{err: ports.ErrAPIKeyDisabled})

	_, err := uc.Execute(context.Background(), "wtch_disabled")

	if !errors.Is(err, usecases.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got %v", err)
	}
}

func TestAuthenticateConnection_KeyExpired_ReturnsErrUnauthorized(t *testing.T) {
	uc := usecases.NewAuthenticateConnectionUseCase(&fakeValidator{err: ports.ErrAPIKeyExpired})

	_, err := uc.Execute(context.Background(), "wtch_expired")

	if !errors.Is(err, usecases.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized, got %v", err)
	}
}

func TestAuthenticateConnection_UnexpectedError_WrapsError(t *testing.T) {
	dbErr := errors.New("connection reset")
	uc := usecases.NewAuthenticateConnectionUseCase(&fakeValidator{err: dbErr})

	_, err := uc.Execute(context.Background(), "wtch_x")

	if errors.Is(err, usecases.ErrUnauthorized) {
		t.Error("unexpected db error should not map to ErrUnauthorized")
	}
	if err == nil {
		t.Error("expected an error")
	}
}
