/**
 * Transport is the port interface for delivering event batches to the gateway.
 * Use cases depend on this interface, not on NodeTransport or BrowserTransport,
 * so tests can inject a FakeTransport without making real HTTP calls.
 */
import type { EventInput } from "../domain/event.js";

export interface Transport {
  /** Send a batch of events. Reject the promise on unrecoverable failure. */
  send(events: EventInput[]): Promise<void>;
}
