// client.rs — public Client API.
//
// Client is the single entry point. It wires together the Buffer, Transport,
// and Flusher and exposes typed event methods that return an EventBuilder.
// All methods are safe to call from multiple threads simultaneously.
use std::sync::Arc;

use crate::buffer::Buffer;
use crate::config::ClientConfig;
use crate::error::{Error, Result};
use crate::event::{EventBuilder, EventType, Severity, WireEvent};
use crate::flusher::Flusher;
use crate::transport::{HttpTransport, Transport};

/// The Watcher24 SDK client.
///
/// Create once per process via `Client::builder(api_key)` and keep for the
/// lifetime of your application. Call `shutdown()` before process exit to
/// flush remaining events. All methods are thread-safe.
pub struct Client {
    pub(crate) buffer: Arc<Buffer>,
    pub(crate) flush_at: usize,
    flusher: Flusher,
    /// Stored separately so Client::flush() can send directly without going
    /// through the background thread's channel (simpler, avoids blocking).
    pub(crate) transport: Arc<dyn Transport>,
}

impl Client {
    /// Returns a builder initialised with the required API key.
    ///
    /// ```rust,no_run
    /// use watcher_sdk::Client;
    /// let client = Client::builder("wtch_...")
    ///     .service_name("payment-api")
    ///     .environment("production")
    ///     .build()?;
    /// # Ok::<(), watcher_sdk::Error>(())
    /// ```
    pub fn builder(api_key: impl Into<String>) -> crate::config::ClientConfigBuilder {
        ClientConfig::builder(api_key)
    }

    /// Creates a Client from a validated ClientConfig.
    pub fn from_config(cfg: ClientConfig) -> Self {
        let transport: Arc<dyn Transport> = Arc::new(HttpTransport::new(
            &cfg.gateway_url,
            &cfg.api_key,
            &cfg.environment,
            cfg.app_id.clone(),
            cfg.service_name.clone(),
        ));
        Self::with_transport(cfg, transport)
    }

    /// Creates a Client with a custom Transport — used by tests to inject a fake.
    pub(crate) fn with_transport(cfg: ClientConfig, transport: Arc<dyn Transport>) -> Self {
        let buffer = Arc::new(Buffer::new(cfg.max_buffer));
        let flusher = Flusher::start(
            Arc::clone(&buffer),
            Arc::clone(&transport),
            cfg.flush_interval,
            cfg.flush_at,
        );
        Self { buffer, flush_at: cfg.flush_at, flusher, transport }
    }

    // ── Typed event methods ───────────────────────────────────────────────────

    /// Records a user action or compliance event at `Info` severity.
    ///
    /// ```rust,no_run
    /// # let client = watcher_sdk::Client::builder("wtch_test").build()?;
    /// use serde_json::json;
    /// client.audit("user.login")
    ///     .user_id("u_abc123")
    ///     .payload(json!({ "method": "email", "ip": "1.2.3.4" }))
    ///     .send()?;
    /// # Ok::<(), watcher_sdk::Error>(())
    /// ```
    pub fn audit(&self, message: impl Into<String>) -> EventBuilder<'_> {
        EventBuilder::new(self, EventType::Audit.as_str(), Severity::Info.as_str(), message)
    }

    /// Records an application log at the given severity.
    ///
    /// ```rust,no_run
    /// # let client = watcher_sdk::Client::builder("wtch_test").build()?;
    /// use serde_json::json;
    /// use watcher_sdk::Severity;
    /// client.log(Severity::Error, "payment failed")
    ///     .payload(json!({ "order_id": "o_001" }))
    ///     .send()?;
    /// # Ok::<(), watcher_sdk::Error>(())
    /// ```
    pub fn log(&self, severity: Severity, message: impl Into<String>) -> EventBuilder<'_> {
        EventBuilder::new(self, EventType::Log.as_str(), severity.as_str(), message)
    }

    /// Records a distributed trace span at `Info` severity.
    /// Chain `.trace_id()`, `.span_id()`, and `.parent_span_id()` to build trace trees.
    pub fn trace(&self, message: impl Into<String>) -> EventBuilder<'_> {
        EventBuilder::new(self, EventType::Trace.as_str(), Severity::Info.as_str(), message)
    }

    /// Records a metric data point at `Info` severity.
    /// Put numeric values in the payload via `.payload(json!({ "p99_ms": 340 }))`.
    pub fn metric(&self, message: impl Into<String>) -> EventBuilder<'_> {
        EventBuilder::new(self, EventType::Metric.as_str(), Severity::Info.as_str(), message)
    }

    /// Records an AI agent event — LLM calls, tool calls, workflow steps, evals.
    /// Always attach a payload with a `"kind"` field so the console can display
    /// AI-specific columns (model, tokens, cost, latency).
    ///
    /// ```rust,no_run
    /// # let client = watcher_sdk::Client::builder("wtch_test").build()?;
    /// use serde_json::json;
    /// use watcher_sdk::Severity;
    /// client.ai(Severity::Info, "llm.call.completed")
    ///     .trace_id("wf-abc123")
    ///     .payload(json!({
    ///         "kind": "llm_call",
    ///         "provider": "openai",
    ///         "model": "gpt-4o",
    ///         "total_tokens": 1240,
    ///         "cost_usd": 0.0037,
    ///         "latency_ms": 820,
    ///     }))
    ///     .send()?;
    /// # Ok::<(), watcher_sdk::Error>(())
    /// ```
    pub fn ai(&self, severity: Severity, message: impl Into<String>) -> EventBuilder<'_> {
        EventBuilder::new(self, EventType::Ai.as_str(), severity.as_str(), message)
    }

    /// Records a generic event when the typed helpers don't fit.
    pub fn event(
        &self,
        event_type: EventType,
        severity: Severity,
        message: impl Into<String>,
    ) -> EventBuilder<'_> {
        EventBuilder::new(self, event_type.as_str(), severity.as_str(), message)
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /// Immediately drains the buffer and sends all pending events.
    /// Blocks until the send completes. Use at the end of a serverless handler
    /// or before a process checkpoint.
    pub fn flush(&self) -> Result<()> {
        let events = self.buffer.drain();
        if events.is_empty() {
            return Ok(());
        }
        self.transport.send(&events).map_err(Error::Transport)
    }

    /// Performs a final flush, stops the background thread, and releases
    /// resources. Always call (or handle via Drop impl) before process exit.
    pub fn shutdown(self) {
        self.flusher.stop();
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /// Called by EventBuilder::send — pushes the event and notifies the flusher.
    pub(crate) fn push(&self, event: WireEvent) -> Result<()> {
        if event.message.is_empty() {
            return Err(Error::EmptyMessage);
        }
        let len = {
            self.buffer.push(event);
            self.buffer.len()
        };
        self.flusher.notify(len, self.flush_at);
        Ok(())
    }
}
