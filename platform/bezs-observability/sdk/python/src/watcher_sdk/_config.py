# SDK-level defaults — change here to affect the entire Python SDK.
# HttpTransport falls back to DEFAULT_GATEWAY_URL when gateway_url=None is passed.

# Production ingest endpoint. Override via Client(gateway_url=...) for self-hosted or local dev.
DEFAULT_GATEWAY_URL = "https://ingest.watcher24.io"
