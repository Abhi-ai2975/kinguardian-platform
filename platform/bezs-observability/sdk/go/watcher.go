// Package watcher is the official Watcher24 Go SDK.
//
// It provides a thread-safe, non-blocking client for sending telemetry events
// (logs, audit trails, distributed traces, metrics) to the Watcher24 ingestion
// gateway. Events are buffered in memory and flushed in the background by a
// single goroutine, so instrumentation never adds latency to your hot path.
//
// # Quick start
//
//	client, err := watcher.NewClient(watcher.ClientOptions{
//	    APIKey:      os.Getenv("WATCHER_API_KEY"),
//	    ServiceName: "my-service",
//	})
//	if err != nil {
//	    log.Fatal(err)
//	}
//	defer client.Shutdown()
//
//	// Audit trail
//	client.Audit("user.login", watcher.WithUserID("u_123"))
//
//	// Structured log
//	client.Log(watcher.SeverityError, "payment failed",
//	    watcher.WithPayload(map[string]any{"order_id": "o_001", "reason": "timeout"}),
//	)
//
//	// Distributed trace span
//	client.Trace("db.query",
//	    watcher.WithTraceID(traceID),
//	    watcher.WithSpanID("span-db"),
//	    watcher.WithParentSpanID("span-root"),
//	)
//
//	// Metric
//	client.Metric("api.latency_ms", watcher.WithPayload(map[string]any{"p99": 340}))
package watcher

import (
	"fmt"
	"net/http"
	"time"
)

// Client is the Watcher24 SDK entry point.
// It is safe to call from multiple goroutines simultaneously.
// Create one Client per process and call Shutdown before exiting.
type Client struct {
	opts    ClientOptions
	buf     *buffer
	flush   *flusher
}

// NewClient constructs a Client and starts the background flush goroutine.
// Returns an error if APIKey is empty or any option is invalid.
func NewClient(opts ClientOptions) (*Client, error) {
	if err := opts.applyDefaults(); err != nil {
		return nil, err
	}
	t := &httpTransport{
		client:      &http.Client{Timeout: 10 * time.Second},
		endpoint:    opts.GatewayURL + "/v1/events",
		apiKey:      opts.APIKey,
		sdkVersion:  sdkVersion,
		runtime:     runtimeLabel(),
		appID:       opts.AppID,
		serviceName: opts.ServiceName,
	}
	return newClientWithTransport(opts, t), nil
}

// newClientWithTransport wires a Client with the given transport instead of the
// default httpTransport. Used by tests to inject a fake without real HTTP calls.
func newClientWithTransport(opts ClientOptions, t Transport) *Client {
	buf := newBuffer(opts.MaxBuffer)
	f := newFlusher(buf, t, opts.FlushInterval, opts.FlushAt)
	return &Client{opts: opts, buf: buf, flush: f}
}

// Audit records a user action or compliance event at info severity.
// Use this for sign-ins, permission changes, data exports — anything
// that needs an immutable audit trail for compliance or debugging.
//
//	client.Audit("user.login",
//	    watcher.WithUserID("u_abc"),
//	    watcher.WithSessionID("sess_xyz"),
//	    watcher.WithPayload(map[string]any{"method": "email", "ip": "1.2.3.4"}),
//	)
func (c *Client) Audit(message string, opts ...EventOption) error {
	return c.capture(EventTypeAudit, SeverityInfo, message, opts...)
}

// Log records an application log at the given severity level.
// Use the SeverityXxx constants for the severity argument.
//
//	client.Log(watcher.SeverityError, "database connection lost",
//	    watcher.WithPayload(map[string]any{"host": "db.internal", "err": err.Error()}),
//	)
func (c *Client) Log(severity, message string, opts ...EventOption) error {
	if !validSeverities[severity] {
		return fmt.Errorf("watcher: invalid severity %q — use a SeverityXxx constant", severity)
	}
	return c.capture(EventTypeLog, severity, message, opts...)
}

// Trace records a distributed trace span at info severity.
// Attach WithTraceID, WithSpanID, and WithParentSpanID to build a trace tree
// that spans multiple services.
//
//	client.Trace("http.request",
//	    watcher.WithTraceID("abc123"),
//	    watcher.WithSpanID("span-root"),
//	    watcher.WithPayload(map[string]any{"method": "POST", "path": "/api/orders"}),
//	)
func (c *Client) Trace(message string, opts ...EventOption) error {
	return c.capture(EventTypeTrace, SeverityInfo, message, opts...)
}

// Metric records a metric data point at info severity.
// Put your numeric values in a Payload map.
//
//	client.Metric("api.request_duration",
//	    watcher.WithPayload(map[string]any{"p50_ms": 45, "p95_ms": 120, "p99_ms": 340}),
//	)
func (c *Client) Metric(message string, opts ...EventOption) error {
	return c.capture(EventTypeMetric, SeverityInfo, message, opts...)
}

// AI records an AI agent event — LLM calls, tool calls, workflow steps, evals.
// severity must be one of the SeverityXxx constants.
// Always attach a Payload with a "kind" field so the console can display
// AI-specific columns (model, tokens, cost, latency).
//
//	client.AI(watcher.SeverityInfo, "llm.call.completed",
//	    watcher.WithTraceID(traceID),
//	    watcher.WithSpanID(spanID),
//	    watcher.WithPayload(map[string]any{
//	        "kind":           "llm_call",
//	        "provider":       "openai",
//	        "model":          "gpt-4o",
//	        "total_tokens":   1240,
//	        "cost_usd":       0.0037,
//	        "latency_ms":     820,
//	    }),
//	)
func (c *Client) AI(severity, message string, opts ...EventOption) error {
	if !validSeverities[severity] {
		return fmt.Errorf("watcher: invalid severity %q — use a SeverityXxx constant", severity)
	}
	return c.capture(EventTypeAI, severity, message, opts...)
}

// Event records a generic event when the typed helpers don't fit.
// eventType must be one of the EventTypeXxx constants.
// severity must be one of the SeverityXxx constants.
//
//	client.Event(watcher.EventTypeSecurity, watcher.SeverityWarn,
//	    "suspicious login",
//	    watcher.WithPayload(map[string]any{"ip": "1.2.3.4", "attempts": 5}),
//	)
func (c *Client) Event(eventType, severity, message string, opts ...EventOption) error {
	if !validEventTypes[eventType] {
		return fmt.Errorf("watcher: invalid event type %q — use an EventTypeXxx constant", eventType)
	}
	if !validSeverities[severity] {
		return fmt.Errorf("watcher: invalid severity %q — use a SeverityXxx constant", severity)
	}
	return c.capture(eventType, severity, message, opts...)
}

// Flush immediately drains the buffer and sends all pending events to the
// gateway. Blocks until the send completes or fails. Use this before a
// process checkpoint — for example at the end of a serverless function handler.
func (c *Client) Flush() error {
	events := c.buf.drain()
	if len(events) == 0 {
		return nil
	}
	return c.flush.transport.Send(events)
}

// Shutdown performs a final flush, stops the background goroutine, and
// releases all resources. Always call this (or defer it) before process exit
// to avoid silently dropping buffered events.
func (c *Client) Shutdown() error {
	return c.flush.stop()
}

// capture is the shared implementation behind all typed event methods.
// It validates, builds the wireEvent, pushes it to the buffer, and notifies
// the flusher in case the flushAt threshold has been reached.
func (c *Client) capture(eventType, severity, message string, opts ...EventOption) error {
	if message == "" {
		return fmt.Errorf("watcher: message must not be empty")
	}

	fields := &EventFields{}
	for _, o := range opts {
		o(fields)
	}

	c.buf.push(wireEvent{
		EventType:    eventType,
		Severity:     severity,
		Message:      message,
		UserID:       fields.UserID,
		SessionID:    fields.SessionID,
		TraceID:      fields.TraceID,
		SpanID:       fields.SpanID,
		ParentSpanID: fields.ParentSpanID,
		Payload:      fields.Payload,
	})
	c.flush.notify()
	return nil
}
