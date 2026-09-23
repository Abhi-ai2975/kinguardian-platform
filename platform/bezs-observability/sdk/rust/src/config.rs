// config.rs — ClientConfig and its builder.
// All tunable parameters live here so callers have one place to look.
use std::time::Duration;

use crate::error::{Error, Result};

pub(crate) const DEFAULT_GATEWAY_URL: &str = "https://ingest.watcher24.io";
pub(crate) const DEFAULT_ENVIRONMENT: &str = "production";
pub(crate) const DEFAULT_FLUSH_INTERVAL: Duration = Duration::from_millis(500);
pub(crate) const DEFAULT_FLUSH_AT: usize = 100;
pub(crate) const DEFAULT_MAX_BUFFER: usize = 10_000;

/// Validated configuration for a Watcher24 Client.
/// Construct via `ClientConfig::builder(api_key)`.
#[derive(Debug)]
pub struct ClientConfig {
    pub(crate) api_key: String,
    pub(crate) app_id: Option<String>,
    pub(crate) service_name: Option<String>,
    pub(crate) environment: String,
    pub(crate) gateway_url: String,
    pub(crate) flush_interval: Duration,
    pub(crate) flush_at: usize,
    pub(crate) max_buffer: usize,
}

impl ClientConfig {
    /// Returns a builder initialised with the required API key.
    pub fn builder(api_key: impl Into<String>) -> ClientConfigBuilder {
        ClientConfigBuilder::new(api_key)
    }
}

/// Fluent builder for ClientConfig. Obtain via `ClientConfig::builder(api_key)`.
pub struct ClientConfigBuilder {
    api_key: String,
    app_id: Option<String>,
    service_name: Option<String>,
    environment: Option<String>,
    gateway_url: Option<String>,
    flush_interval: Option<Duration>,
    flush_at: Option<usize>,
    max_buffer: Option<usize>,
}

impl ClientConfigBuilder {
    fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            app_id: None,
            service_name: None,
            environment: None,
            gateway_url: None,
            flush_interval: None,
            flush_at: None,
            max_buffer: None,
        }
    }

    /// Links events to a registered application in the Watcher24 dashboard.
    /// Get the app ID from Settings → Apps.
    pub fn app_id(mut self, id: impl Into<String>) -> Self {
        self.app_id = Some(id.into());
        self
    }

    /// Human-readable component label (e.g. `"payment-api"`, `"worker"`).
    /// Sent as `X-Service-Name` and shown in the dashboard Service column.
    pub fn service_name(mut self, name: impl Into<String>) -> Self {
        self.service_name = Some(name.into());
        self
    }

    /// Deployment stage label. Default: `"production"`.
    pub fn environment(mut self, env: impl Into<String>) -> Self {
        self.environment = Some(env.into());
        self
    }

    /// Base URL of the ingestion gateway. Default: `https://ingest.watcher24.io`.
    /// Override for self-hosted deployments or local development.
    pub fn gateway_url(mut self, url: impl Into<String>) -> Self {
        self.gateway_url = Some(url.into());
        self
    }

    /// How often the background thread sends buffered events. Default: 500ms.
    pub fn flush_interval(mut self, d: Duration) -> Self {
        self.flush_interval = Some(d);
        self
    }

    /// Buffer size that triggers an immediate flush. Default: 100.
    pub fn flush_at(mut self, n: usize) -> Self {
        self.flush_at = Some(n);
        self
    }

    /// Maximum events held in memory. Oldest is silently dropped when full.
    /// Default: 10,000.
    pub fn max_buffer(mut self, n: usize) -> Self {
        self.max_buffer = Some(n);
        self
    }

    /// Validates options, builds a `ClientConfig`, and starts a `Client`.
    /// Returns `Error::MissingApiKey` if `api_key` is empty.
    pub fn build(self) -> Result<crate::Client> {
        if self.api_key.is_empty() {
            return Err(Error::MissingApiKey);
        }
        let cfg = ClientConfig {
            api_key: self.api_key,
            app_id: self.app_id,
            service_name: self.service_name,
            environment: self.environment.unwrap_or_else(|| DEFAULT_ENVIRONMENT.to_owned()),
            gateway_url: self.gateway_url.unwrap_or_else(|| DEFAULT_GATEWAY_URL.to_owned()),
            flush_interval: self.flush_interval.unwrap_or(DEFAULT_FLUSH_INTERVAL),
            flush_at: self.flush_at.unwrap_or(DEFAULT_FLUSH_AT),
            max_buffer: self.max_buffer.unwrap_or(DEFAULT_MAX_BUFFER),
        };
        Ok(crate::Client::from_config(cfg))
    }
}
