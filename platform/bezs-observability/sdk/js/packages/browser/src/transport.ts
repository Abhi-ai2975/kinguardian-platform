/**
 * Browser transport — uses fetch for normal batches and navigator.sendBeacon
 * for page unload (visibilitychange: hidden), which survives navigation unlike fetch.
 * Registers and cleans up the visibilitychange listener automatically.
 */
import type { Client, EventInput, Transport } from "@watcher/core";
import { toWireEvent } from "@watcher/core";

const RETRY_DELAYS_MS = [100, 200, 400];

export class BrowserTransport implements Transport {
  private readonly url: string;
  private readonly headers: Record<string, string>;

  constructor(
    gatewayUrl: string,
    apiKey: string,
    // appId is optional — public tokens (wpub_) and app-scoped secret keys
    // don't need it; the gateway resolves the application from the key itself.
    appId: string | undefined,
    environment: string,
    // serviceName is the developer-set component label (e.g. "payment-api").
    // Sent as X-Service-Name header when provided.
    serviceName?: string,
  ) {
    this.url = `${gatewayUrl.replace(/\/$/, "")}/v1/events`;
    this.headers = {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
      "x-environment": environment,
      "x-sdk-version": "0.1.0",
      // Only send x-app-id when explicitly provided — omit for public tokens
      // and app-scoped keys (gateway resolves app from the key itself).
      ...(appId ? { "x-app-id": appId } : {}),
      ...(serviceName ? { "x-service-name": serviceName } : {}),
    };
  }

  async send(events: EventInput[]): Promise<void> {
    const body = JSON.stringify(events.map(toWireEvent));
    let lastErr: Error | null = null;

    for (const delay of [0, ...RETRY_DELAYS_MS]) {
      if (delay > 0) await sleep(delay);
      try {
        const res = await fetch(this.url, { method: "POST", headers: this.headers, body });
        if (res.status >= 400 && res.status < 500) {
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

  /**
   * Send remaining buffered events via sendBeacon on page hide.
   * sendBeacon is fire-and-forget and guaranteed to complete even after navigation.
   */
  sendBeacon(events: EventInput[]): void {
    if (events.length === 0) return;
    const body = JSON.stringify(events);
    navigator.sendBeacon(this.url, new Blob([body], { type: "application/json" }));
  }
}

/** Register a page-hide listener that drains the client buffer via sendBeacon. */
export function registerBeaconFlusher(client: Client, transport: BrowserTransport): () => void {
  const handler = () => {
    if (document.visibilityState === "hidden") {
      // Flush synchronously via beacon — can't await here.
      void client.flush().catch(() => {
        // If flush fails (race), sendBeacon is best-effort anyway.
      });
    }
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
