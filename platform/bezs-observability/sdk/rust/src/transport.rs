// transport.rs — Transport trait and HTTP implementation.
// The trait lets tests inject a FakeTransport without real network calls.
// HttpTransport uses ureq (blocking, no async runtime required).
use std::time::Duration;

use crate::event::WireEvent;

/// Contract for delivering event batches to the gateway.
/// Implemented by HttpTransport in production and FakeTransport in tests.
pub(crate) trait Transport: Send + Sync {
    /// Sends a batch of events. Returns Ok(()) on success.
    /// Implementations should retry on transient (5xx / network) errors and
    /// return Err immediately on client errors (4xx) to avoid pointless retries.
    fn send(&self, events: &[WireEvent]) -> Result<(), String>;
}

/// Retry delays applied between successive send attempts (milliseconds).
/// Only used for 5xx and network errors — 4xx failures return immediately.
const RETRY_DELAYS_MS: &[u64] = &[100, 200, 400];

/// HTTP transport that POSTs event batches to the Watcher24 gateway.
/// Uses ureq (blocking) — no async runtime, one thread-safe agent.
pub(crate) struct HttpTransport {
    endpoint: String,
    api_key: String,
    sdk_version: &'static str,
    /// Runtime string sent as X-Runtime (e.g. "rust/1.76").
    runtime: String,
    environment: String,
    app_id: Option<String>,
    service_name: Option<String>,
}

impl HttpTransport {
    pub fn new(
        gateway_url: &str,
        api_key: impl Into<String>,
        environment: impl Into<String>,
        app_id: Option<String>,
        service_name: Option<String>,
    ) -> Self {
        Self {
            endpoint: format!("{}/v1/events", gateway_url.trim_end_matches('/')),
            api_key: api_key.into(),
            sdk_version: env!("CARGO_PKG_VERSION"),
            runtime: format!("rust/{}", rustc_version_string()),
            environment: environment.into(),
            app_id,
            service_name,
        }
    }

    fn attempt(&self, body: &str) -> Result<(), TransportError> {
        let mut req = ureq::post(&self.endpoint)
            .set("Content-Type", "application/json")
            .set("Authorization", &format!("Bearer {}", self.api_key))
            .set("X-SDK-Version", self.sdk_version)
            .set("X-Runtime", &self.runtime)
            .set("X-Environment", &self.environment);

        if let Some(ref id) = self.app_id {
            req = req.set("X-App-ID", id);
        }
        if let Some(ref name) = self.service_name {
            req = req.set("X-Service-Name", name);
        }

        match req.send_string(body) {
            Ok(_) => Ok(()),
            Err(ureq::Error::Status(status, _)) => Err(TransportError::Http(status)),
            Err(e) => Err(TransportError::Network(e.to_string())),
        }
    }
}

impl Transport for HttpTransport {
    fn send(&self, events: &[WireEvent]) -> Result<(), String> {
        let body = match serde_json::to_string(events) {
            Ok(b) => b,
            Err(e) => return Err(format!("serialise: {e}")),
        };

        // First attempt is immediate; subsequent attempts wait the retry delay.
        for (i, &delay_ms) in std::iter::once(&0u64).chain(RETRY_DELAYS_MS.iter()).enumerate() {
            if i > 0 {
                std::thread::sleep(Duration::from_millis(delay_ms));
            }
            match self.attempt(&body) {
                Ok(()) => return Ok(()),
                Err(TransportError::Http(s)) if (400..500).contains(&s) => {
                    // 4xx — retrying the same payload won't change anything.
                    return Err(format!("gateway returned HTTP {s}"));
                }
                Err(_) if i < RETRY_DELAYS_MS.len() => continue,
                Err(e) => return Err(e.to_string()),
            }
        }
        Err(format!("send failed after {} attempts", RETRY_DELAYS_MS.len() + 1))
    }
}

#[derive(Debug)]
enum TransportError {
    Http(u16),
    Network(String),
}

impl std::fmt::Display for TransportError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransportError::Http(s) => write!(f, "HTTP {s}"),
            TransportError::Network(e) => write!(f, "network: {e}"),
        }
    }
}

/// Returns a short rustc version string for the X-Runtime header.
/// Falls back to "unknown" if the version cannot be determined.
fn rustc_version_string() -> &'static str {
    // CARGO_PKG_RUST_VERSION is set at compile time by Cargo for packages
    // that declare a `rust-version` field. We use it as a best-effort label.
    option_env!("CARGO_PKG_RUST_VERSION").unwrap_or("unknown")
}
