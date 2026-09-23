/**
 * SDK-level defaults — change here to affect all packages that import from @watcher/core.
 * Browser and Node transports both fall back to DEFAULT_GATEWAY_URL when no gatewayUrl
 * is provided in ClientOptions.
 */

/** Production ingest endpoint. Override via clientOptions.gatewayUrl for self-hosted or local dev. */
export const DEFAULT_GATEWAY_URL = "https://ingest.watcher24.io";
