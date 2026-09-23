// event.go — domain types and constants for Watcher24 SDK events.
// This file defines what an event looks like both to the caller (EventFields,
// EventOption) and on the wire to the gateway (wireEvent JSON struct).
package watcher

// Event type constants mirror the gateway's accepted event_type values.
// Prefer the typed helpers (Audit, Log, Trace, Metric) over passing these
// directly — they fill in the correct severity automatically.
const (
	EventTypeAudit          = "audit"
	EventTypeLog            = "log"
	EventTypeTrace          = "trace"
	EventTypeMetric         = "metric"
	EventTypeEvent          = "event"
	EventTypeSecurity       = "security"
	EventTypeAI             = "ai"
	EventTypeSystem         = "system"
	EventTypeInfrastructure = "infrastructure"
)

// Severity constants define the five accepted severity levels.
// All event types accept any severity; typed helpers use sensible defaults.
const (
	SeverityDebug    = "debug"
	SeverityInfo     = "info"
	SeverityWarn     = "warn"
	SeverityError    = "error"
	SeverityCritical = "critical"
)

var validEventTypes = map[string]bool{
	EventTypeAudit: true, EventTypeLog: true, EventTypeTrace: true,
	EventTypeMetric: true, EventTypeEvent: true, EventTypeSecurity: true,
	EventTypeAI: true, EventTypeSystem: true, EventTypeInfrastructure: true,
}

var validSeverities = map[string]bool{
	SeverityDebug: true, SeverityInfo: true, SeverityWarn: true,
	SeverityError: true, SeverityCritical: true,
}

// EventFields holds every optional field that can be attached to an event.
// Populate it via EventOption functional options rather than directly.
type EventFields struct {
	UserID       string
	SessionID    string
	TraceID      string
	SpanID       string
	ParentSpanID string
	Payload      map[string]any
}

// EventOption is a functional option that sets one or more fields on an event.
// Pass options as variadic arguments to Audit, Log, Trace, Metric, or Event.
type EventOption func(*EventFields)

// WithUserID attaches a user identifier — useful for audit events and
// correlating errors back to a specific user.
func WithUserID(id string) EventOption { return func(f *EventFields) { f.UserID = id } }

// WithSessionID attaches a session identifier for user-session correlation.
func WithSessionID(id string) EventOption { return func(f *EventFields) { f.SessionID = id } }

// WithTraceID attaches a distributed trace ID so events from multiple services
// can be correlated in the trace explorer.
func WithTraceID(id string) EventOption { return func(f *EventFields) { f.TraceID = id } }

// WithSpanID attaches a span ID within a trace.
func WithSpanID(id string) EventOption { return func(f *EventFields) { f.SpanID = id } }

// WithParentSpanID attaches the parent span ID, forming a parent-child span
// relationship in the trace tree.
func WithParentSpanID(id string) EventOption {
	return func(f *EventFields) { f.ParentSpanID = id }
}

// WithPayload attaches arbitrary structured data to the event. Values must be
// JSON-serialisable. Useful for domain context (order IDs, request params, etc.).
func WithPayload(p map[string]any) EventOption { return func(f *EventFields) { f.Payload = p } }

// wireEvent is the JSON representation sent to the gateway over HTTP.
// Field names are snake_case to match the gateway schema. omitempty ensures
// optional empty fields are not included in the serialised payload.
type wireEvent struct {
	EventType    string         `json:"event_type"`
	Severity     string         `json:"severity"`
	Message      string         `json:"message"`
	UserID       string         `json:"user_id,omitempty"`
	SessionID    string         `json:"session_id,omitempty"`
	TraceID      string         `json:"trace_id,omitempty"`
	SpanID       string         `json:"span_id,omitempty"`
	ParentSpanID string         `json:"parent_span_id,omitempty"`
	Payload      map[string]any `json:"payload,omitempty"`
}
