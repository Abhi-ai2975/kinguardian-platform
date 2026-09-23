// Package domain contains the core business entities for the gateway.
// This package has zero external dependencies — it must stay that way.
// All other layers depend on these types; this layer depends on nothing.
package domain

import "time"

// EventType classifies the kind of telemetry being ingested.
// It determines which Redis Stream topic the event is published to.
type EventType string

const (
	EventTypeAudit          EventType = "audit"
	EventTypeLog            EventType = "log"
	EventTypeMetric         EventType = "metric"
	EventTypeTrace          EventType = "trace"
	EventTypeSecurity       EventType = "security"
	EventTypeFrontend       EventType = "frontend"
	EventTypeAI             EventType = "ai"
	EventTypeSystem         EventType = "system"
	EventTypeInfrastructure EventType = "infrastructure"
)

// Severity represents the importance level of an event.
type Severity string

const (
	SeverityDebug    Severity = "debug"
	SeverityInfo     Severity = "info"
	SeverityWarn     Severity = "warn"
	SeverityError    Severity = "error"
	SeverityCritical Severity = "critical"
)

// IsValid returns true if the severity is one of the known values.
func (s Severity) IsValid() bool {
	switch s {
	case SeverityDebug, SeverityInfo, SeverityWarn, SeverityError, SeverityCritical:
		return true
	}
	return false
}

// IsValid returns true if the event type is one of the known values.
func (e EventType) IsValid() bool {
	switch e {
	case EventTypeAudit, EventTypeLog, EventTypeMetric, EventTypeTrace,
		EventTypeSecurity, EventTypeFrontend, EventTypeAI,
		EventTypeSystem, EventTypeInfrastructure:
		return true
	}
	return false
}

// StreamTopic maps the event type to the Redis Stream topic it belongs to.
// All events of the same type are published to the same stream so that
// workers can consume by specialization (e.g. the audit worker only reads
// from stream:audit).
func (e EventType) StreamTopic() string {
	switch e {
	case EventTypeSystem, EventTypeInfrastructure:
		return "stream:system"
	default:
		return "stream:" + string(e)
	}
}

// Event is the canonical telemetry event that flows through the gateway.
// It is populated from the SDK request body and then enriched by the gateway
// before being published to Redis Streams.
type Event struct {
	// Routing fields — resolved by the gateway, not trusted from the request body
	OrganizationID string `json:"organization_id"`
	ApplicationID  string `json:"application_id"`
	Environment    string `json:"environment"`

	// Classification
	EventType EventType `json:"event_type"`
	Severity  Severity  `json:"severity"`

	// Content
	Message string `json:"message"`

	// Timestamps — Timestamp is SDK-reported, IngestedAt is set by the gateway
	Timestamp  time.Time `json:"timestamp"`
	IngestedAt time.Time `json:"ingested_at"`

	// Distributed tracing — optional, populated for trace events
	TraceID      string `json:"trace_id,omitempty"`
	SpanID       string `json:"span_id,omitempty"`
	ParentSpanID string `json:"parent_span_id,omitempty"`

	// Actor — who triggered the event
	UserID    string `json:"user_id,omitempty"`
	SessionID string `json:"session_id,omitempty"`

	// Arbitrary event-specific data — stored as a raw JSON string in ClickHouse
	Payload map[string]any `json:"payload,omitempty"`

	// Source identifies where the event originated.
	// "client" for events submitted via a public token (browser, mobile, desktop).
	// "server" for events submitted via a secret API key from a server-side SDK.
	// Set by the gateway based on the key type — never trusted from SDK input.
	Source string `json:"source,omitempty"`

	// ServiceName is an optional developer-set label identifying the component
	// that sent the event (e.g. "payment-api", "ai-agent", "mobile-ios").
	// Sent by the SDK as X-Service-Name and stored verbatim — not validated.
	ServiceName string `json:"service_name,omitempty"`

	// Gateway-added metadata — set during enrichment, not from SDK
	IPAddress  string `json:"ip_address,omitempty"`
	SDKVersion string `json:"sdk_version,omitempty"`
	Runtime    string `json:"runtime,omitempty"`
	Region     string `json:"region,omitempty"`
}
