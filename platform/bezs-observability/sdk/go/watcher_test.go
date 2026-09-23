// watcher_test.go — unit tests for the Watcher24 Go SDK.
// All tests use a fakeTransport so no live gateway is needed.
// Tests are in the same package so they can access unexported helpers.
package watcher

import (
	"errors"
	"sync"
	"testing"
	"time"
)

// ── Fake transport ────────────────────────────────────────────────────────────

// fakeTransport records every Send call for assertion in tests.
// sendErr, if non-nil, is returned by Send so error-path tests can be written.
type fakeTransport struct {
	mu      sync.Mutex
	batches [][]wireEvent
	sendErr error
}

func (f *fakeTransport) Send(events []wireEvent) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.sendErr != nil {
		return f.sendErr
	}
	cp := make([]wireEvent, len(events))
	copy(cp, events)
	f.batches = append(f.batches, cp)
	return nil
}

func (f *fakeTransport) allEvents() []wireEvent {
	f.mu.Lock()
	defer f.mu.Unlock()
	var all []wireEvent
	for _, b := range f.batches {
		all = append(all, b...)
	}
	return all
}

// ── Test helpers ─────────────────────────────────────────────────────────────

// newTestClient creates a Client backed by a fakeTransport with a very long
// flush interval so automatic ticks never fire during tests. Tests flush
// explicitly via client.Flush().
func newTestClient(t *testing.T, ft *fakeTransport) *Client {
	t.Helper()
	opts := ClientOptions{
		APIKey:        "wtch_test",
		FlushInterval: 24 * time.Hour, // prevent auto-flush during tests
		FlushAt:       100_000,        // prevent threshold flush during tests
		MaxBuffer:     1_000,
	}
	_ = opts.applyDefaults()
	c := newClientWithTransport(opts, ft)
	t.Cleanup(func() { _ = c.Shutdown() })
	return c
}

// ── NewClient ─────────────────────────────────────────────────────────────────

func TestNewClient_MissingAPIKey_ReturnsError(t *testing.T) {
	_, err := NewClient(ClientOptions{})
	if err == nil {
		t.Fatal("expected error for missing APIKey, got nil")
	}
}

func TestNewClient_ValidOptions_ReturnsClient(t *testing.T) {
	c, err := NewClient(ClientOptions{APIKey: "wtch_test"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer c.Shutdown()
}

func TestNewClient_DefaultsApplied_GatewayURLSet(t *testing.T) {
	c, err := NewClient(ClientOptions{APIKey: "wtch_test"})
	if err != nil {
		t.Fatal(err)
	}
	defer c.Shutdown()
	if c.opts.GatewayURL != defaultGatewayURL {
		t.Errorf("expected default gateway URL, got %q", c.opts.GatewayURL)
	}
	if c.opts.Environment != defaultEnvironment {
		t.Errorf("expected default environment, got %q", c.opts.Environment)
	}
}

// ── Audit ─────────────────────────────────────────────────────────────────────

func TestAudit_ValidMessage_PushesAuditEventToBuffer(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	if err := c.Audit("user.login", WithUserID("u_123")); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_ = c.Flush()

	events := ft.allEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	e := events[0]
	if e.EventType != EventTypeAudit {
		t.Errorf("expected event_type=%q, got %q", EventTypeAudit, e.EventType)
	}
	if e.Severity != SeverityInfo {
		t.Errorf("expected severity=%q, got %q", SeverityInfo, e.Severity)
	}
	if e.Message != "user.login" {
		t.Errorf("expected message=%q, got %q", "user.login", e.Message)
	}
	if e.UserID != "u_123" {
		t.Errorf("expected user_id=%q, got %q", "u_123", e.UserID)
	}
}

func TestAudit_EmptyMessage_ReturnsError(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	err := c.Audit("")
	if err == nil {
		t.Fatal("expected error for empty message, got nil")
	}
}

// ── Log ───────────────────────────────────────────────────────────────────────

func TestLog_ValidSeverity_PushesLogEvent(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	if err := c.Log(SeverityError, "db connection lost"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_ = c.Flush()

	events := ft.allEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].EventType != EventTypeLog {
		t.Errorf("expected event_type=%q, got %q", EventTypeLog, events[0].EventType)
	}
	if events[0].Severity != SeverityError {
		t.Errorf("expected severity=%q, got %q", SeverityError, events[0].Severity)
	}
}

func TestLog_InvalidSeverity_ReturnsError(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	err := c.Log("ultra-critical", "something bad")
	if err == nil {
		t.Fatal("expected error for invalid severity, got nil")
	}
}

func TestLog_AllValidSeverities_Accepted(t *testing.T) {
	severities := []string{SeverityDebug, SeverityInfo, SeverityWarn, SeverityError, SeverityCritical}
	for _, sev := range severities {
		ft := &fakeTransport{}
		c := newTestClient(t, ft)
		if err := c.Log(sev, "test"); err != nil {
			t.Errorf("severity %q should be valid but got error: %v", sev, err)
		}
		_ = c.Shutdown()
	}
}

// ── Trace ─────────────────────────────────────────────────────────────────────

func TestTrace_WithSpanFields_SetsAllFields(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	_ = c.Trace("db.query",
		WithTraceID("trace-abc"),
		WithSpanID("span-1"),
		WithParentSpanID("span-root"),
	)
	_ = c.Flush()

	events := ft.allEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	e := events[0]
	if e.EventType != EventTypeTrace {
		t.Errorf("expected event_type=%q, got %q", EventTypeTrace, e.EventType)
	}
	if e.TraceID != "trace-abc" {
		t.Errorf("expected trace_id=%q, got %q", "trace-abc", e.TraceID)
	}
	if e.SpanID != "span-1" {
		t.Errorf("expected span_id=%q, got %q", "span-1", e.SpanID)
	}
	if e.ParentSpanID != "span-root" {
		t.Errorf("expected parent_span_id=%q, got %q", "span-root", e.ParentSpanID)
	}
}

// ── Metric ────────────────────────────────────────────────────────────────────

func TestMetric_WithPayload_SetsMetricEventType(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	_ = c.Metric("api.latency", WithPayload(map[string]any{"p99_ms": 340}))
	_ = c.Flush()

	events := ft.allEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].EventType != EventTypeMetric {
		t.Errorf("expected event_type=%q, got %q", EventTypeMetric, events[0].EventType)
	}
	if events[0].Payload["p99_ms"] != 340 {
		t.Errorf("expected payload p99_ms=340, got %v", events[0].Payload["p99_ms"])
	}
}

// ── Event ─────────────────────────────────────────────────────────────────────

func TestEvent_InvalidEventType_ReturnsError(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	err := c.Event("not-a-type", SeverityInfo, "msg")
	if err == nil {
		t.Fatal("expected error for invalid event type, got nil")
	}
}

func TestEvent_InvalidSeverity_ReturnsError(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	err := c.Event(EventTypeSecurity, "mega-critical", "msg")
	if err == nil {
		t.Fatal("expected error for invalid severity, got nil")
	}
}

func TestEvent_ValidSecurityEvent_Accepted(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	err := c.Event(EventTypeSecurity, SeverityWarn, "suspicious login")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// ── Flush ─────────────────────────────────────────────────────────────────────

func TestFlush_BufferedEvents_SendsBatchToTransport(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	_ = c.Audit("a.one")
	_ = c.Audit("a.two")
	_ = c.Log(SeverityInfo, "hello")

	if err := c.Flush(); err != nil {
		t.Fatalf("flush error: %v", err)
	}

	events := ft.allEvents()
	if len(events) != 3 {
		t.Errorf("expected 3 events, got %d", len(events))
	}
}

func TestFlush_EmptyBuffer_SendsNothing(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	if err := c.Flush(); err != nil {
		t.Fatalf("unexpected error on empty flush: %v", err)
	}
	if len(ft.batches) != 0 {
		t.Errorf("expected no batches sent, got %d", len(ft.batches))
	}
}

func TestFlush_TransportError_ReturnsError(t *testing.T) {
	ft := &fakeTransport{sendErr: errors.New("gateway down")}
	c := newTestClient(t, ft)

	_ = c.Audit("user.login")
	err := c.Flush()
	if err == nil {
		t.Fatal("expected error when transport fails, got nil")
	}
}

// ── Buffer ────────────────────────────────────────────────────────────────────

func TestBuffer_ExceedsMaxSize_DropsOldestEvent(t *testing.T) {
	ft := &fakeTransport{}
	opts := ClientOptions{
		APIKey:        "wtch_test",
		FlushInterval: 24 * time.Hour,
		FlushAt:       100_000,
		MaxBuffer:     3, // very small buffer
	}
	_ = opts.applyDefaults()
	c := newClientWithTransport(opts, ft)
	t.Cleanup(func() { _ = c.Shutdown() })

	// Push 4 events into a buffer of size 3 — first event should be dropped.
	_ = c.Audit("first")
	_ = c.Audit("second")
	_ = c.Audit("third")
	_ = c.Audit("fourth") // this should push "first" out

	_ = c.Flush()

	events := ft.allEvents()
	if len(events) != 3 {
		t.Fatalf("expected 3 events (oldest dropped), got %d", len(events))
	}
	// The remaining events should be second, third, fourth (not first).
	for _, e := range events {
		if e.Message == "first" {
			t.Error("oldest event 'first' should have been dropped but was sent")
		}
	}
}

// ── EventOption helpers ───────────────────────────────────────────────────────

func TestWithPayload_NilPayload_OmittedFromWireEvent(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	_ = c.Audit("no.payload")
	_ = c.Flush()

	events := ft.allEvents()
	if len(events) != 1 {
		t.Fatal("expected 1 event")
	}
	if events[0].Payload != nil {
		t.Errorf("expected nil payload, got %v", events[0].Payload)
	}
}

func TestWithSessionID_AttachesSessionID(t *testing.T) {
	ft := &fakeTransport{}
	c := newTestClient(t, ft)

	_ = c.Audit("user.login", WithUserID("u_1"), WithSessionID("sess_abc"))
	_ = c.Flush()

	events := ft.allEvents()
	if events[0].SessionID != "sess_abc" {
		t.Errorf("expected session_id=%q, got %q", "sess_abc", events[0].SessionID)
	}
}

// ── Shutdown ──────────────────────────────────────────────────────────────────

func TestShutdown_FlushesPendingEventsBeforeExit(t *testing.T) {
	ft := &fakeTransport{}
	opts := ClientOptions{
		APIKey:        "wtch_test",
		FlushInterval: 24 * time.Hour,
		FlushAt:       100_000,
		MaxBuffer:     1_000,
	}
	_ = opts.applyDefaults()
	c := newClientWithTransport(opts, ft)

	_ = c.Audit("before.shutdown")
	_ = c.Log(SeverityInfo, "also.before.shutdown")

	if err := c.Shutdown(); err != nil {
		t.Fatalf("shutdown error: %v", err)
	}

	events := ft.allEvents()
	if len(events) != 2 {
		t.Errorf("expected 2 events flushed on shutdown, got %d", len(events))
	}
}
