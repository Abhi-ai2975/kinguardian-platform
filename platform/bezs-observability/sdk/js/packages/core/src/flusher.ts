/**
 * Triggers FlushBufferUseCase on two conditions:
 *   1. Time-based: every `flushInterval` milliseconds (setInterval)
 *   2. Size-based: whenever the buffer reaches `flushAt` events
 *
 * Uses setInterval — works in both Node.js and browsers.
 * Call stop() to clearInterval and flush remaining events on shutdown.
 */
import type { EventBuffer } from "./buffer.js";
import type { FlushBufferUseCase } from "./usecases/flush-buffer.js";

export class BackgroundFlusher {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly flushUseCase: FlushBufferUseCase,
    private readonly buffer: EventBuffer,
    private readonly flushInterval: number,
    private readonly flushAt: number,
  ) {}

  start(): void {
    this.timer = setInterval(() => void this.tick(), this.flushInterval);
    // Timers should not prevent Node.js process from exiting.
    if (this.timer !== null && typeof this.timer === "object" && "unref" in this.timer) {
      (this.timer as { unref: () => void }).unref();
    }
  }

  async stop(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    try {
      await this.flushUseCase.execute();
    } catch (err) {
      console.error("[watcher] final flush failed:", err);
    }
  }

  /** Called by capture use case after each push to check the size trigger. */
  checkSizeTrigger(): void {
    if (this.buffer.size >= this.flushAt) {
      void this.tick();
    }
  }

  private async tick(): Promise<void> {
    try {
      await this.flushUseCase.execute();
    } catch (err) {
      console.error("[watcher] flush error:", err);
    }
  }
}
