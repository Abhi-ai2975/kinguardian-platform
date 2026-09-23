/**
 * @watcher/node — Node.js client factory.
 * Import this package in any Node.js server, script, or worker.
 */
import { Client, DEFAULT_GATEWAY_URL, type ClientOptions } from "@watcher/core";
import { NodeTransport } from "./transport.js";

export type { ClientOptions } from "@watcher/core";
export { NodeTransport } from "./transport.js";

/** Create a Watcher Client backed by the Node.js HTTP transport. */
export function createNodeClient(options: ClientOptions): Client {
  const transport = new NodeTransport(
    options.gatewayUrl ?? DEFAULT_GATEWAY_URL,
    options.apiKey,
    options.appId,
    options.environment ?? "production",
    options.serviceName,
  );
  return new Client(transport, options);
}
