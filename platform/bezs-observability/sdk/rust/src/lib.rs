//! # watcher-sdk — Watcher24 Rust SDK
//!
//! Official Rust client for [Watcher24](https://watcher24.io).
//! Sends telemetry events (logs, audit trails, traces, metrics) to the
//! Watcher24 ingestion gateway using a background-flush buffer backed by a
//! single thread. Thread-safe. Zero async runtime required.
//!
//! ## Quick start
//!
//! ```rust,no_run
//! use watcher_sdk::{Client, Severity};
//! use serde_json::json;
//!
//! let client = Client::builder("wtch_...")
//!     .service_name("payment-api")
//!     .environment("production")
//!     .build()
//!     .unwrap();
//!
//! // Audit trail
//! client.audit("user.login")
//!     .user_id("u_abc123")
//!     .payload(json!({ "method": "email" }))
//!     .send()
//!     .unwrap();
//!
//! // Structured log
//! client.log(Severity::Error, "payment failed")
//!     .payload(json!({ "order_id": "o_001", "reason": "card_declined" }))
//!     .send()
//!     .unwrap();
//!
//! // Distributed trace span
//! client.trace("db.query")
//!     .trace_id("trace-abc")
//!     .span_id("span-db")
//!     .parent_span_id("span-root")
//!     .send()
//!     .unwrap();
//!
//! // Metric
//! client.metric("api.latency")
//!     .payload(json!({ "p99_ms": 340 }))
//!     .send()
//!     .unwrap();
//!
//! // Always shutdown before exit to flush remaining events
//! client.shutdown();
//! ```

mod buffer;
mod config;
mod flusher;
mod transport;

pub mod client;
pub mod error;
pub mod event;

// Re-export the public API at the crate root for ergonomic use.
pub use client::Client;
pub use config::{ClientConfig, ClientConfigBuilder};
pub use error::{Error, Result};
pub use event::{EventBuilder, EventType, Severity};

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use serde_json::json;

    use super::*;
    use crate::config::ClientConfig;
    use crate::event::WireEvent;
    use crate::transport::Transport;

    // ── Fake transport ────────────────────────────────────────────────────────

    /// Records every batch sent so tests can assert on the wire events.
    #[derive(Clone)]
    struct FakeTransport {
        batches: Arc<Mutex<Vec<Vec<WireEvent>>>>,
        fail: bool,
    }

    impl FakeTransport {
        fn new() -> Self {
            Self { batches: Arc::new(Mutex::new(Vec::new())), fail: false }
        }
        fn failing() -> Self {
            Self { batches: Arc::new(Mutex::new(Vec::new())), fail: true }
        }
        fn all_events(&self) -> Vec<WireEvent> {
            self.batches.lock().unwrap().iter().flatten().cloned().collect()
        }
    }

    impl Transport for FakeTransport {
        fn send(&self, events: &[WireEvent]) -> std::result::Result<(), String> {
            if self.fail {
                return Err("simulated transport failure".to_owned());
            }
            self.batches.lock().unwrap().push(events.to_vec());
            Ok(())
        }
    }

    // ── Test client factory ───────────────────────────────────────────────────

    /// Creates a Client with a very long flush interval so auto-flush never
    /// fires during tests. Tests call client.flush() explicitly.
    fn test_client(transport: FakeTransport) -> (Client, FakeTransport) {
        let transport_clone = transport.clone();
        let arc: Arc<dyn Transport> = Arc::new(transport);
        let cfg = ClientConfig {
            api_key: "wtch_test".to_owned(),
            app_id: None,
            service_name: None,
            environment: "test".to_owned(),
            gateway_url: "http://localhost:9999".to_owned(),
            flush_interval: std::time::Duration::from_secs(86400),
            flush_at: 100_000,
            max_buffer: 1_000,
        };
        (Client::with_transport(cfg, arc), transport_clone)
    }

    // ── ClientConfig ──────────────────────────────────────────────────────────

    #[test]
    fn test_client_config_missing_api_key_returns_error() {
        // .err().unwrap() avoids the T: Debug bound that .unwrap_err() requires.
        let err = Client::builder("").build().err().unwrap();
        assert!(matches!(err, Error::MissingApiKey));
    }

    #[test]
    fn test_client_config_valid_api_key_builds_successfully() {
        Client::builder("wtch_test").build().unwrap().shutdown();
    }

    // ── Audit ─────────────────────────────────────────────────────────────────

    #[test]
    fn test_audit_valid_message_pushes_audit_event_to_buffer() {
        let (client, transport) = test_client(FakeTransport::new());
        client.audit("user.login").user_id("u_123").send().unwrap();
        client.flush().unwrap();
        client.shutdown();

        let events = transport.all_events();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_type, "audit");
        assert_eq!(events[0].severity, "info");
        assert_eq!(events[0].message, "user.login");
        assert_eq!(events[0].user_id.as_deref(), Some("u_123"));
    }

    #[test]
    fn test_audit_empty_message_returns_error() {
        let (client, _) = test_client(FakeTransport::new());
        let err = client.audit("").send().unwrap_err();
        assert!(matches!(err, Error::EmptyMessage));
        client.shutdown();
    }

    // ── Log ───────────────────────────────────────────────────────────────────

    #[test]
    fn test_log_error_severity_sets_correct_event_type_and_severity() {
        let (client, transport) = test_client(FakeTransport::new());
        client.log(Severity::Error, "db failed").send().unwrap();
        client.flush().unwrap();
        client.shutdown();

        let events = transport.all_events();
        assert_eq!(events[0].event_type, "log");
        assert_eq!(events[0].severity, "error");
    }

    #[test]
    fn test_log_all_severities_accepted() {
        let severities = [
            Severity::Debug, Severity::Info, Severity::Warn,
            Severity::Error, Severity::Critical,
        ];
        for sev in severities {
            let (client, _) = test_client(FakeTransport::new());
            client.log(sev, "test").send().unwrap();
            client.shutdown();
        }
    }

    // ── Trace ─────────────────────────────────────────────────────────────────

    #[test]
    fn test_trace_with_span_fields_sets_all_wire_fields() {
        let (client, transport) = test_client(FakeTransport::new());
        client.trace("db.query")
            .trace_id("trace-abc")
            .span_id("span-1")
            .parent_span_id("span-root")
            .send()
            .unwrap();
        client.flush().unwrap();
        client.shutdown();

        let e = &transport.all_events()[0];
        assert_eq!(e.event_type, "trace");
        assert_eq!(e.trace_id.as_deref(), Some("trace-abc"));
        assert_eq!(e.span_id.as_deref(), Some("span-1"));
        assert_eq!(e.parent_span_id.as_deref(), Some("span-root"));
    }

    // ── Metric ────────────────────────────────────────────────────────────────

    #[test]
    fn test_metric_with_payload_sets_metric_event_type() {
        let (client, transport) = test_client(FakeTransport::new());
        client.metric("api.latency").payload(json!({ "p99_ms": 340 })).send().unwrap();
        client.flush().unwrap();
        client.shutdown();

        let e = &transport.all_events()[0];
        assert_eq!(e.event_type, "metric");
        assert_eq!(e.payload.as_ref().unwrap()["p99_ms"], 340);
    }

    // ── Generic event ─────────────────────────────────────────────────────────

    #[test]
    fn test_event_security_type_accepted() {
        let (client, transport) = test_client(FakeTransport::new());
        client.event(EventType::Security, Severity::Warn, "suspicious login").send().unwrap();
        client.flush().unwrap();
        client.shutdown();

        assert_eq!(transport.all_events()[0].event_type, "security");
    }

    // ── Payload ───────────────────────────────────────────────────────────────

    #[test]
    fn test_no_payload_omits_payload_field() {
        let (client, transport) = test_client(FakeTransport::new());
        client.audit("no.payload").send().unwrap();
        client.flush().unwrap();
        client.shutdown();

        assert!(transport.all_events()[0].payload.is_none());
    }

    #[test]
    fn test_session_id_attaches_to_wire_event() {
        let (client, transport) = test_client(FakeTransport::new());
        client.audit("user.login").session_id("sess_abc").send().unwrap();
        client.flush().unwrap();
        client.shutdown();

        assert_eq!(transport.all_events()[0].session_id.as_deref(), Some("sess_abc"));
    }

    // ── Flush ─────────────────────────────────────────────────────────────────

    #[test]
    fn test_flush_sends_all_buffered_events() {
        let (client, transport) = test_client(FakeTransport::new());
        client.audit("a").send().unwrap();
        client.audit("b").send().unwrap();
        client.log(Severity::Info, "c").send().unwrap();
        client.flush().unwrap();
        client.shutdown();

        assert_eq!(transport.all_events().len(), 3);
    }

    #[test]
    fn test_flush_empty_buffer_does_not_call_transport() {
        let (client, transport) = test_client(FakeTransport::new());
        client.flush().unwrap();
        client.shutdown();

        assert!(transport.batches.lock().unwrap().is_empty());
    }

    #[test]
    fn test_flush_transport_error_returns_error() {
        let (client, _) = test_client(FakeTransport::failing());
        client.audit("will fail").send().unwrap();
        let err = client.flush().unwrap_err();
        assert!(matches!(err, Error::Transport(_)));
        client.shutdown();
    }

    // ── Shutdown ──────────────────────────────────────────────────────────────

    #[test]
    fn test_shutdown_flushes_pending_events() {
        let ft = FakeTransport::new();
        let ft_clone = ft.clone();
        let arc: Arc<dyn Transport> = Arc::new(ft);
        let cfg = ClientConfig {
            api_key: "wtch_test".to_owned(),
            app_id: None,
            service_name: None,
            environment: "test".to_owned(),
            gateway_url: "http://localhost:9999".to_owned(),
            flush_interval: std::time::Duration::from_secs(86400),
            flush_at: 100_000,
            max_buffer: 1_000,
        };
        let client = Client::with_transport(cfg, arc);
        client.audit("before.shutdown").send().unwrap();
        client.log(Severity::Info, "also.before").send().unwrap();
        client.shutdown(); // must flush before joining

        assert_eq!(ft_clone.all_events().len(), 2);
    }
}
