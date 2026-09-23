/**
 * React Native transport — uses the globally available fetch API.
 *
 * Key differences from BrowserTransport:
 *   - No sendBeacon (not available in React Native)
 *   - No Origin header sent — React Native fetch omits it automatically,
 *     which is correct: the gateway allows requests without Origin so native
 *     clients are not blocked by the origin allowlist (browser-only concept)
 *   - X-Runtime is "react-native" since there is no process.version
 *
 * Uses public tokens (wpub_) only — never secret keys.
 * Secret keys must not be bundled into mobile apps.
 */
import { toWireEvent, type EventInput, type Transport } from "@watcher/core";

const RETRY_DELAYS_MS = [100, 200, 400];
const SDK_VERSION = "0.1.0";

export class ReactNativeTransport implements Transport {
  private readonly url: string;
  private readonly headers: Record<string, string>;

  constructor(
    gatewayUrl: string,
    apiKey: string,
    appId: string | undefined,
    environment: string,
    serviceName?: string,
  ) {
    this.url = `${gatewayUrl.replace(/\/$/, "")}/v1/events`;
    this.headers = {
      "content-type":  "application/json",
      "authorization": `Bearer ${apiKey}`,
      "x-sdk-version": SDK_VERSION,
      "x-runtime":     "react-native",
      "x-environment": environment,
      // Send X-App-ID and X-Service-Name only when provided.
      ...(appId       ? { "x-app-id":       appId }       : {}),
      ...(serviceName ? { "x-service-name": serviceName } : {}),
    };
  }

  async send(events: EventInput[]): Promise<void> {
    const body = JSON.stringify(events.map(toWireEvent));
    let lastErr: Error | null = null;

    for (const delay of [0, ...RETRY_DELAYS_MS]) {
      if (delay > 0) await sleep(delay);
      try {
        const res = await fetch(this.url, {
          method:  "POST",
          headers: this.headers,
          body,
        });
        if (res.status >= 400 && res.status < 500) {
          // 4xx is not retryable — auth failure, invalid payload, plan limit, etc.
          console.error(`[watcher] HTTP ${res.status} — batch dropped`);
          return;
        }
        if (res.ok) return;
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }

    console.error(`[watcher] batch dropped after retries: ${lastErr?.message}`);
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
