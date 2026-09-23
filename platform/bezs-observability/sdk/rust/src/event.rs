// event.rs — domain types, constants, and the EventBuilder.
//
// WireEvent is the JSON shape sent to the gateway.
// EventBuilder is the fluent API returned by every Client event method —
// the caller chains optional fields and finalises with .send().
use serde::Serialize;
use serde_json::Value;

// ── Severity ──────────────────────────────────────────────────────────────────

/// The five accepted severity levels for all event types.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Debug,
    Info,
    Warn,
    Error,
    Critical,
}

impl Severity {
    /// Returns the lowercase wire string the gateway expects.
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Severity::Debug => "debug",
            Severity::Info => "info",
            Severity::Warn => "warn",
            Severity::Error => "error",
            Severity::Critical => "critical",
        }
    }
}

// ── EventType ─────────────────────────────────────────────────────────────────

/// All event types accepted by the Watcher24 gateway.
/// Use the typed helpers (Client::audit, Client::log, etc.) instead of passing
/// these directly unless you need the generic Client::event method.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EventType {
    Audit,
    Log,
    Trace,
    Metric,
    Event,
    Security,
    Ai,
    System,
    Infrastructure,
}

impl EventType {
    /// Returns the lowercase wire string the gateway expects.
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            EventType::Audit => "audit",
            EventType::Log => "log",
            EventType::Trace => "trace",
            EventType::Metric => "metric",
            EventType::Event => "event",
            EventType::Security => "security",
            EventType::Ai => "ai",
            EventType::System => "system",
            EventType::Infrastructure => "infrastructure",
        }
    }
}

// ── WireEvent ─────────────────────────────────────────────────────────────────

/// The JSON representation sent to the gateway.
/// `skip_serializing_if` keeps the payload compact — empty optional fields are
/// omitted rather than serialised as `null`.
#[derive(Debug, Clone, Serialize)]
pub(crate) struct WireEvent {
    pub event_type: String,
    pub severity: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub span_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_span_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<Value>,
}

// ── EventBuilder ──────────────────────────────────────────────────────────────

/// Fluent builder returned by every Client event method.
///
/// Chain optional fields then call `.send()` to push the event to the buffer.
/// The `#[must_use]` attribute causes a compiler warning if the builder is
/// created but `.send()` is never called — preventing silent event drops.
#[must_use = "call .send() to record this event"]
pub struct EventBuilder<'a> {
    /// Back-reference to the client — used to push to the buffer on send().
    pub(crate) client: &'a crate::Client,
    pub(crate) event_type: String,
    pub(crate) severity: String,
    pub(crate) message: String,
    pub(crate) user_id: Option<String>,
    pub(crate) session_id: Option<String>,
    pub(crate) trace_id: Option<String>,
    pub(crate) span_id: Option<String>,
    pub(crate) parent_span_id: Option<String>,
    pub(crate) payload: Option<Value>,
}

impl<'a> EventBuilder<'a> {
    pub(crate) fn new(
        client: &'a crate::Client,
        event_type: &str,
        severity: &str,
        message: impl Into<String>,
    ) -> Self {
        Self {
            client,
            event_type: event_type.to_owned(),
            severity: severity.to_owned(),
            message: message.into(),
            user_id: None,
            session_id: None,
            trace_id: None,
            span_id: None,
            parent_span_id: None,
            payload: None,
        }
    }

    /// Attach a user identifier (useful for audit events and error attribution).
    pub fn user_id(mut self, id: impl Into<String>) -> Self {
        self.user_id = Some(id.into());
        self
    }

    /// Attach a session identifier for user-session correlation.
    pub fn session_id(mut self, id: impl Into<String>) -> Self {
        self.session_id = Some(id.into());
        self
    }

    /// Attach a distributed trace ID for cross-service correlation.
    pub fn trace_id(mut self, id: impl Into<String>) -> Self {
        self.trace_id = Some(id.into());
        self
    }

    /// Attach a span ID within a trace.
    pub fn span_id(mut self, id: impl Into<String>) -> Self {
        self.span_id = Some(id.into());
        self
    }

    /// Attach the parent span ID to form a parent-child span relationship.
    pub fn parent_span_id(mut self, id: impl Into<String>) -> Self {
        self.parent_span_id = Some(id.into());
        self
    }

    /// Attach arbitrary structured data. Use `serde_json::json!` for ergonomic literals.
    ///
    /// ```rust,no_run
    /// # let client = watcher_sdk::Client::builder("wtch_test").build()?;
    /// use serde_json::json;
    /// use watcher_sdk::Severity;
    /// client.log(Severity::Error, "payment failed")
    ///     .payload(json!({ "order_id": "o_001", "reason": "card_declined" }))
    ///     .send()?;
    /// # Ok::<(), watcher_sdk::Error>(())
    /// ```
    pub fn payload(mut self, p: Value) -> Self {
        self.payload = Some(p);
        self
    }

    /// Push the event to the in-memory buffer. Non-blocking — returns as soon as
    /// the event is queued. The background thread delivers it to the gateway.
    pub fn send(self) -> crate::Result<()> {
        self.client.push(WireEvent {
            event_type: self.event_type,
            severity: self.severity,
            message: self.message,
            user_id: self.user_id,
            session_id: self.session_id,
            trace_id: self.trace_id,
            span_id: self.span_id,
            parent_span_id: self.parent_span_id,
            payload: self.payload,
        })
    }
}
