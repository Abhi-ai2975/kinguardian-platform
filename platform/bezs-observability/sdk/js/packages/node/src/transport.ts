/**
 * Node.js HTTP transport — uses node:https (stdlib) to keep the package dependency-free.
 * Retries failed requests with exponential backoff before giving up on a batch.
 */
import * as https from "node:https";
import * as http from "node:http";
import { toWireEvent, type EventInput, type Transport } from "@watcher/core";

const RETRY_DELAYS_MS = [100, 200, 400];

export class NodeTransport implements Transport {
  private readonly url: URL;
  private readonly headers: Record<string, string>;

  constructor(
    gatewayUrl: string,
    apiKey: string,
    // appId is optional — app-scoped keys and public tokens (wpub_) don't need it;
    // the gateway resolves the application from the key itself.
    appId: string | undefined,
    environment: string,
    // serviceName is the developer-set component label (e.g. "auth-worker").
    // Sent as X-Service-Name header when provided.
    serviceName?: string,
  ) {
    this.url = new URL("/v1/events", gatewayUrl);
    this.headers = {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
      "x-environment": environment,
      "x-sdk-version": "0.1.0",
      "x-runtime": `node/${process.version}`,
      // Only send x-app-id when explicitly provided.
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
        const status = await this.post(body);
        // 4xx is not retryable — bad request or auth failure.
        if (status >= 400 && status < 500) {
          console.error(`[watcher] HTTP ${status} — batch dropped`);
          return;
        }
        if (status >= 200 && status < 300) return;
        lastErr = new Error(`HTTP ${status}`);
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }

    console.error(`[watcher] batch dropped after retries: ${lastErr?.message}`);
  }

  private post(body: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const lib = this.url.protocol === "https:" ? https : http;
      const req = lib.request(
        {
          hostname: this.url.hostname,
          port: this.url.port,
          path: this.url.pathname,
          method: "POST",
          headers: { ...this.headers, "content-length": Buffer.byteLength(body) },
        },
        (res) => {
          // Drain response body to free the socket.
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.on("error", reject);
      req.end(body);
    });
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
