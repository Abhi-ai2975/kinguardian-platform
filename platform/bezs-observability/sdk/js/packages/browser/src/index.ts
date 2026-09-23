/**
 * @watcher/browser — browser client factory.
 * Import this in any browser-side JavaScript bundle.
 * Automatically registers a sendBeacon flush on page hide.
 */
import { Client, DEFAULT_GATEWAY_URL, type ClientOptions } from "@watcher/core";
import { BrowserTransport, registerBeaconFlusher } from "./transport.js";

export type { ClientOptions } from "@watcher/core";
export { BrowserTransport } from "./transport.js";

/** Create a Watcher Client backed by the fetch/sendBeacon transport. */
export function createBrowserClient(options: ClientOptions): Client {
  const transport = new BrowserTransport(
    options.gatewayUrl ?? DEFAULT_GATEWAY_URL,
    options.apiKey,
    options.appId,
    options.environment ?? "production",
    options.serviceName,
  );
  const client = new Client(transport, options);
  registerBeaconFlusher(client, transport);
  return client;
}
