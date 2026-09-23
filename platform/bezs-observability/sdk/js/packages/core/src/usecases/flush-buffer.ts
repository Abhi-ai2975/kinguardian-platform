/**
 * Drains the buffer and delivers the batch to the gateway via Transport.
 * The only use case that performs I/O — called by the flusher timer and client.flush().
 */
import type { EventBuffer } from "../buffer.js";
import type { Transport } from "../ports/transport.js";

export class FlushBufferUseCase {
  constructor(
    private readonly buffer: EventBuffer,
    private readonly transport: Transport,
  ) {}

  /** Drain and ship. Returns the number of events sent (0 if buffer was empty). */
  async execute(): Promise<number> {
    const events = this.buffer.drain();
    if (events.length === 0) return 0;
    await this.transport.send(events);
    return events.length;
  }
}
