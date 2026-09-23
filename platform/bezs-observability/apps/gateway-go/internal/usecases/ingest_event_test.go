// Unit tests for the IngestEvent use case.
// All dependencies are faked â€” no real Redis or Postgres required.
// Tests follow the pattern: Test<UseCase>_<Condition>_<ExpectedBehaviour>
package usecases_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"watcher24/gateway/internal/domain"
	"watcher24/gateway/internal/usecases"
)

// fakePublisher is an in-memory implementation of ports.EventPublisher.
// It records published events so tests can assert on what was published.
type fakePublisher struct {
	published []*domain.Event
	err       error // if set, Publish returns this error
}

func (f *fakePublisher) Publish(_ context.Context, event *domain.Event) error {
	if f.err != nil {
		return f.err
	}
	f.published = append(f.published, event)
	return nil
}

func (f *fakePublisher) PublishBatch(_ context.Context, events []*domain.Event) error {
	if f.err != nil {
		return f.err
	}
	f.published = append(f.published, events...)
	return nil
}

// fakeLimiter is an in-memory implementation of ports.LimitChecker.
// count is the value returned by MonthlyCount; err overrides with an error.
type fakeLimiter struct {
	count int64
	err   error
}

func (f *fakeLimiter) MonthlyCount(_ context.Context, _ string) (int64, error) {
	return f.count, f.err
}

// noLimiter returns a fake limiter that always reports zero usage (no blocking).
func noLimiter() *fakeLimiter { return &fakeLimiter{} }

// validInput returns a minimal valid IngestInput for use in tests.
func validInput() usecases.IngestInput {
	return usecases.IngestInput{
		OrganizationID: "org_test",
		ApplicationID:  "billing-api",
		Environment:    "production",
		EventType:      domain.EventTypeAudit,
		Severity:       domain.SeverityInfo,
		Message:        "user logged in",
	}
}

func TestIngestEvent_ValidEvent_PublishesSuccessfully(t *testing.T) {
	pub := &fakePublisher{}
	uc := usecases.NewIngestEventUseCase(pub, noLimiter())

	err := uc.Execute(context.Background(), validInput())
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if len(pub.published) != 1 {
		t.Fatalf("expected 1 published event, got %d", len(pub.published))
	}
}

func TestIngestEvent_ValidEvent_SetsIngestedAt(t *testing.T) {
	pub := &fakePublisher{}
	uc := usecases.NewIngestEventUseCase(pub, noLimiter())

	before := time.Now().UTC()
	_ = uc.Execute(context.Background(), validInput())
	after := time.Now().UTC()

	event := pub.published[0]
	if event.IngestedAt.Before(before) || event.IngestedAt.After(after) {
		t.Errorf("IngestedAt %v not within expected range [%v, %v]", event.IngestedAt, before, after)
	}
}

func TestIngestEvent_ValidEvent_UsesServerTimeWhenTimestampMissing(t *testing.T) {
	pub := &fakePublisher{}
	uc := usecases.NewIngestEventUseCase(pub, noLimiter())

	input := validInput()
	input.Timestamp = nil // SDK did not provide a timestamp

	before := time.Now().UTC()
	_ = uc.Execute(context.Background(), input)
	after := time.Now().UTC()

	event := pub.published[0]
	if event.Timestamp.Before(before) || event.Timestamp.After(after) {
		t.Errorf("Timestamp %v should be server time in range [%v, %v]", event.Timestamp, before, after)
	}
}

func TestIngestEvent_ValidEvent_UsesProvidedTimestamp(t *testing.T) {
	pub := &fakePublisher{}
	uc := usecases.NewIngestEventUseCase(pub, noLimiter())

	provided := time.Date(2026, 5, 25, 10, 0, 0, 0, time.UTC)
	input := validInput()
	input.Timestamp = &provided

	_ = uc.Execute(context.Background(), input)

	if !pub.published[0].Timestamp.Equal(provided) {
		t.Errorf("Timestamp = %v, want %v", pub.published[0].Timestamp, provided)
	}
}

func TestIngestEvent_MissingOrganizationID_ReturnsError(t *testing.T) {
	uc := usecases.NewIngestEventUseCase(&fakePublisher{}, noLimiter())

	input := validInput()
	input.OrganizationID = ""

	err := uc.Execute(context.Background(), input)
	if !errors.Is(err, usecases.ErrMissingOrganizationID) {
		t.Errorf("expected ErrMissingOrganizationID, got: %v", err)
	}
}

func TestIngestEvent_MissingMessage_ReturnsError(t *testing.T) {
	uc := usecases.NewIngestEventUseCase(&fakePublisher{}, noLimiter())

	input := validInput()
	input.Message = ""

	err := uc.Execute(context.Background(), input)
	if !errors.Is(err, usecases.ErrMissingMessage) {
		t.Errorf("expected ErrMissingMessage, got: %v", err)
	}
}

func TestIngestEvent_InvalidEventType_ReturnsError(t *testing.T) {
	uc := usecases.NewIngestEventUseCase(&fakePublisher{}, noLimiter())

	input := validInput()
	input.EventType = "not_a_real_type"

	err := uc.Execute(context.Background(), input)
	if !errors.Is(err, usecases.ErrInvalidEventType) {
		t.Errorf("expected ErrInvalidEventType, got: %v", err)
	}
}

func TestIngestEvent_InvalidSeverity_ReturnsError(t *testing.T) {
	uc := usecases.NewIngestEventUseCase(&fakePublisher{}, noLimiter())

	input := validInput()
	input.Severity = "LOUD"

	err := uc.Execute(context.Background(), input)
	if !errors.Is(err, usecases.ErrInvalidSeverity) {
		t.Errorf("expected ErrInvalidSeverity, got: %v", err)
	}
}

func TestIngestEvent_PublisherFailure_ReturnsError(t *testing.T) {
	pub := &fakePublisher{err: errors.New("redis down")}
	uc := usecases.NewIngestEventUseCase(pub, noLimiter())

	err := uc.Execute(context.Background(), validInput())
	if err == nil {
		t.Fatal("expected error when publisher fails, got nil")
	}
}

func TestIngestBatch_ValidBatch_PublishesAllEvents(t *testing.T) {
	pub := &fakePublisher{}
	uc := usecases.NewIngestEventUseCase(pub, noLimiter())

	batch := usecases.IngestBatchInput{
		Events: []usecases.IngestInput{validInput(), validInput(), validInput()},
	}

	err := uc.ExecuteBatch(context.Background(), batch)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if len(pub.published) != 3 {
		t.Errorf("expected 3 published events, got %d", len(pub.published))
	}
}

func TestIngestBatch_EmptyBatch_DoesNothing(t *testing.T) {
	pub := &fakePublisher{}
	uc := usecases.NewIngestEventUseCase(pub, noLimiter())

	err := uc.ExecuteBatch(context.Background(), usecases.IngestBatchInput{Events: nil})
	if err != nil {
		t.Fatalf("expected no error for empty batch, got: %v", err)
	}
	if len(pub.published) != 0 {
		t.Errorf("expected 0 published events, got %d", len(pub.published))
	}
}

func TestIngestBatch_ExceedsMaxSize_ReturnsError(t *testing.T) {
	pub := &fakePublisher{}
	uc := usecases.NewIngestEventUseCase(pub, noLimiter())

	events := make([]usecases.IngestInput, 501)
	for i := range events {
		events[i] = validInput()
	}

	err := uc.ExecuteBatch(context.Background(), usecases.IngestBatchInput{Events: events})
	if !errors.Is(err, usecases.ErrBatchTooLarge) {
		t.Errorf("expected ErrBatchTooLarge, got: %v", err)
	}
}
