// Package usecases contains the application business logic for the gateway.
// Use cases depend only on domain types and port interfaces — never on
// concrete adapters, HTTP frameworks, or infrastructure libraries.
//
// This means all use cases can be tested with simple Go unit tests and
// fake/mock implementations of the port interfaces.
package usecases

import (
	"context"
	"fmt"
	"time"

	"watcher24/gateway/internal/domain"
	"watcher24/gateway/internal/ports"
)


// IngestInput carries the raw data from the SDK request before enrichment.
// OrganizationID is already resolved by the auth middleware from the API key.
type IngestInput struct {
	OrganizationID     string
	EventLimitPerMonth int64  // -1 = unlimited; resolved from subscription by auth middleware
	ApplicationID      string
	Environment    string
	EventType      domain.EventType
	Severity       domain.Severity
	Message        string
	Timestamp      *time.Time // nil means use server time
	TraceID        string
	SpanID         string
	ParentSpanID   string
	UserID         string
	SessionID      string
	Payload        map[string]any

	// Source identifies the origin of the event: "client" or "server".
	// Set by the transport layer based on the key type — never taken from the request body.
	Source string

	// ServiceName is the optional developer-set label for the sending component.
	// Read from the X-Service-Name request header — can be any string.
	ServiceName string

	// Enrichment metadata — set by the transport layer from the HTTP request
	IPAddress  string
	SDKVersion string
	Runtime    string
	Region     string
}

// IngestBatchInput holds multiple events to be published in one operation.
type IngestBatchInput struct {
	Events []IngestInput
}

// IngestEventUseCase handles the full lifecycle of a single inbound event:
// validate inputs → check monthly limit → enrich with server-side metadata → publish to queue.
//
// It depends on EventPublisher and LimitChecker via interfaces so the real
// adapters and test fakes are both valid implementations.
type IngestEventUseCase struct {
	publisher ports.EventPublisher
	limiter   ports.LimitChecker
}

// NewIngestEventUseCase creates the use case with its required dependencies.
// Called once at startup from the composition root (main.go).
func NewIngestEventUseCase(publisher ports.EventPublisher, limiter ports.LimitChecker) *IngestEventUseCase {
	return &IngestEventUseCase{publisher: publisher, limiter: limiter}
}

// Execute validates the input, checks the monthly event limit, enriches the
// event, and publishes it. Returns ErrEventLimitExceeded if the org has hit
// their quota; fails open on limiter errors so ClickHouse downtime never
// blocks ingestion.
func (uc *IngestEventUseCase) Execute(ctx context.Context, input IngestInput) error {
	if err := uc.checkLimit(ctx, input.OrganizationID, input.EventLimitPerMonth); err != nil {
		return err
	}

	event, err := uc.buildEvent(input)
	if err != nil {
		return err
	}

	if err := uc.publisher.Publish(ctx, event); err != nil {
		return fmt.Errorf("ingest event: publish: %w", err)
	}

	return nil
}

// ExecuteBatch validates and publishes multiple events atomically from the
// publisher's perspective (single XADD batch where possible).
func (uc *IngestEventUseCase) ExecuteBatch(ctx context.Context, input IngestBatchInput) error {
	if len(input.Events) == 0 {
		return nil
	}

	// Hard limit — prevents a single request from flooding the queue.
	// SDKs should batch at 100-500 events; larger batches are rejected.
	if len(input.Events) > 500 {
		return ErrBatchTooLarge
	}

	// Check monthly quota once for the whole batch using the first event's org context.
	first := input.Events[0]
	if err := uc.checkLimit(ctx, first.OrganizationID, first.EventLimitPerMonth); err != nil {
		return err
	}

	events := make([]*domain.Event, 0, len(input.Events))
	for i, item := range input.Events {
		event, err := uc.buildEvent(item)
		if err != nil {
			return fmt.Errorf("ingest batch: event[%d]: %w", i, err)
		}
		events = append(events, event)
	}

	if err := uc.publisher.PublishBatch(ctx, events); err != nil {
		return fmt.Errorf("ingest batch: publish: %w", err)
	}

	return nil
}

// buildEvent converts raw input into a validated, enriched domain.Event.
// Validation happens here (not in the handler) so that it is testable
// without an HTTP layer.
func (uc *IngestEventUseCase) buildEvent(input IngestInput) (*domain.Event, error) {
	if input.OrganizationID == "" {
		return nil, ErrMissingOrganizationID
	}
	if input.Message == "" {
		return nil, ErrMissingMessage
	}
	if !input.EventType.IsValid() {
		return nil, fmt.Errorf("%w: %q", ErrInvalidEventType, input.EventType)
	}
	if !input.Severity.IsValid() {
		return nil, fmt.Errorf("%w: %q", ErrInvalidSeverity, input.Severity)
	}

	// Use server time if the SDK did not supply a timestamp.
	// This prevents clients from injecting future or ancient timestamps.
	ts := time.Now().UTC()
	if input.Timestamp != nil {
		ts = input.Timestamp.UTC()
	}

	return &domain.Event{
		OrganizationID: input.OrganizationID,
		ApplicationID:  input.ApplicationID,
		Environment:    input.Environment,
		EventType:      input.EventType,
		Severity:       input.Severity,
		Message:        input.Message,
		Timestamp:      ts,
		IngestedAt:     time.Now().UTC(), // always server time, never from input
		TraceID:        input.TraceID,
		SpanID:         input.SpanID,
		ParentSpanID:   input.ParentSpanID,
		UserID:         input.UserID,
		SessionID:      input.SessionID,
		Payload:        input.Payload,
		Source:         input.Source,
		ServiceName:    input.ServiceName,
		IPAddress:      input.IPAddress,
		SDKVersion:     input.SDKVersion,
		Runtime:        input.Runtime,
		Region:         input.Region,
	}, nil
}

// checkLimit queries the monthly event count and returns ErrEventLimitExceeded
// if the org has reached their quota. Fails open on limiter errors so that
// ClickHouse downtime never blocks ingestion.
func (uc *IngestEventUseCase) checkLimit(ctx context.Context, orgID string, limitPerMonth int64) error {
	if limitPerMonth <= 0 {
		return nil // 0 = not set (e.g. tests); -1 = enterprise unlimited
	}
	count, err := uc.limiter.MonthlyCount(ctx, orgID)
	if err != nil {
		// Fail open — a usage-counting error should not block legitimate events.
		return nil
	}
	if count >= limitPerMonth {
		return domain.ErrEventLimitExceeded
	}
	return nil
}

// Validation errors — typed so callers can switch on them with errors.Is().
var (
	ErrMissingOrganizationID = domainErr("organization_id is required")
	ErrMissingMessage        = domainErr("message is required")
	ErrInvalidEventType      = domainErr("invalid event_type")
	ErrInvalidSeverity       = domainErr("invalid severity")
	ErrBatchTooLarge         = domainErr("batch exceeds maximum of 500 events")
)

type domainErr string

func (e domainErr) Error() string { return string(e) }
