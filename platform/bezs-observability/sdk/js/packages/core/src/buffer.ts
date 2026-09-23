/**
 * In-memory FIFO queue between capture and flush.
 * JavaScript is single-threaded — no lock needed.
 * Drops the oldest event when the cap is exceeded to prevent unbounded memory growth.
 */
import type { EventInput } from "./domain/event.js";

export class EventBuffer {
  private readonly queue: EventInput[] = [];

  constructor(private readonly maxSize: number = 10_000) {}

  push(event: EventInput): void {
    if (this.queue.length >= this.maxSize) {
      // Prefer losing old data over blocking the caller or growing unboundedly.
      this.queue.shift();
    }
    this.queue.push(event);
  }

  /** Return all buffered events and clear the queue atomically. */
  drain(): EventInput[] {
    return this.queue.splice(0, this.queue.length);
  }

  get size(): number {
    return this.queue.length;
  }
}
