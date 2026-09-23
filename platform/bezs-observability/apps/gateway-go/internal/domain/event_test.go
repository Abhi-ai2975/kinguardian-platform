// Tests for domain value objects — EventType, Severity, and StreamTopic mapping.
// These are pure unit tests with zero external dependencies.
package domain_test

import (
	"testing"

	"watcher24/gateway/internal/domain"
)

func TestEventType_IsValid(t *testing.T) {
	valid := []domain.EventType{
		domain.EventTypeAudit, domain.EventTypeLog, domain.EventTypeMetric,
		domain.EventTypeTrace, domain.EventTypeSecurity, domain.EventTypeFrontend,
		domain.EventTypeAI, domain.EventTypeSystem, domain.EventTypeInfrastructure,
	}
	for _, et := range valid {
		if !et.IsValid() {
			t.Errorf("expected %q to be valid", et)
		}
	}

	invalid := []domain.EventType{"", "unknown", "AUDIT", "Log"}
	for _, et := range invalid {
		if et.IsValid() {
			t.Errorf("expected %q to be invalid", et)
		}
	}
}

func TestSeverity_IsValid(t *testing.T) {
	valid := []domain.Severity{
		domain.SeverityDebug, domain.SeverityInfo, domain.SeverityWarn,
		domain.SeverityError, domain.SeverityCritical,
	}
	for _, s := range valid {
		if !s.IsValid() {
			t.Errorf("expected %q to be valid", s)
		}
	}

	invalid := []domain.Severity{"", "WARNING", "INFO", "trace"}
	for _, s := range invalid {
		if s.IsValid() {
			t.Errorf("expected %q to be invalid", s)
		}
	}
}

func TestEventType_StreamTopic(t *testing.T) {
	cases := []struct {
		eventType domain.EventType
		expected  string
	}{
		{domain.EventTypeAudit, "stream:audit"},
		{domain.EventTypeLog, "stream:log"},
		{domain.EventTypeMetric, "stream:metric"},
		{domain.EventTypeTrace, "stream:trace"},
		{domain.EventTypeSecurity, "stream:security"},
		{domain.EventTypeFrontend, "stream:frontend"},
		{domain.EventTypeAI, "stream:ai"},
		// Both system types route to the same stream
		{domain.EventTypeSystem, "stream:system"},
		{domain.EventTypeInfrastructure, "stream:system"},
	}

	for _, tc := range cases {
		got := tc.eventType.StreamTopic()
		if got != tc.expected {
			t.Errorf("StreamTopic(%q) = %q, want %q", tc.eventType, got, tc.expected)
		}
	}
}
