// error.rs — SDK error type.
// A single Error enum covers all failure modes so callers pattern-match
// without pulling in third-party error libraries.
use std::fmt;

/// All errors that can be returned by the Watcher24 SDK.
#[derive(Debug)]
pub enum Error {
    /// `api_key` was empty when building the client.
    MissingApiKey,
    /// `message` passed to an event method was empty.
    EmptyMessage,
    /// A severity string outside the five accepted values was used.
    InvalidSeverity(String),
    /// An event type string outside the accepted set was used.
    InvalidEventType(String),
    /// The HTTP transport failed to deliver a batch.
    Transport(String),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::MissingApiKey => write!(f, "watcher: api_key is required"),
            Error::EmptyMessage => write!(f, "watcher: message must not be empty"),
            Error::InvalidSeverity(s) => write!(f, "watcher: invalid severity {s:?} — use a Severity variant"),
            Error::InvalidEventType(t) => write!(f, "watcher: invalid event type {t:?} — use an EventType variant"),
            Error::Transport(e) => write!(f, "watcher: transport error: {e}"),
        }
    }
}

impl std::error::Error for Error {}

/// Convenience alias used throughout the SDK.
pub type Result<T> = std::result::Result<T, Error>;
