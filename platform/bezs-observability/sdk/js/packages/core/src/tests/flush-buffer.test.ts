import { describe, expect, it, vi } from "vitest";
import { EventBuffer } from "../buffer.js";
import type { EventInput } from "../domain/event.js";
import type { Transport } from "../ports/transport.js";
import { FlushBufferUseCase } from "../usecases/flush-buffer.js";

class FakeTransport implements Transport {
  sent: EventInput[][] = [];
  shouldFail = false;

  async send(events: EventInput[]): Promise<void> {
    if (this.shouldFail) throw new Error("network error");
    this.sent.push([...events]);
  }

  get total(): number {
    return this.sent.reduce((n, b) => n + b.length, 0);
  }
}

const pushN = (buf: EventBuffer, n: number) => {
  for (let i = 0; i < n; i++) buf.push({ eventType: "log", severity: "info", message: `msg-${i}` });
};

describe("FlushBufferUseCase", () => {
  it("sends buffered events to transport", async () => {
    const buf = new EventBuffer();
    const t = new FakeTransport();
    const uc = new FlushBufferUseCase(buf, t);
    pushN(buf, 3);

    const count = await uc.execute();

    expect(count).toBe(3);
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0]).toHaveLength(3);
  });

  it("empty buffer does not call transport", async () => {
    const buf = new EventBuffer();
    const t = new FakeTransport();
    const uc = new FlushBufferUseCase(buf, t);

    const count = await uc.execute();

    expect(count).toBe(0);
    expect(t.sent).toHaveLength(0);
  });

  it("buffer is empty after flush", async () => {
    const buf = new EventBuffer();
    const t = new FakeTransport();
    const uc = new FlushBufferUseCase(buf, t);
    pushN(buf, 5);

    await uc.execute();

    expect(buf.size).toBe(0);
  });

  it("transport failure rejects the promise", async () => {
    const buf = new EventBuffer();
    const t = new FakeTransport();
    t.shouldFail = true;
    const uc = new FlushBufferUseCase(buf, t);
    pushN(buf, 2);

    await expect(uc.execute()).rejects.toThrow("network error");
  });

  it("second flush call sends nothing", async () => {
    const buf = new EventBuffer();
    const t = new FakeTransport();
    const uc = new FlushBufferUseCase(buf, t);
    pushN(buf, 3);

    await uc.execute();
    const count = await uc.execute();

    expect(count).toBe(0);
    expect(t.sent).toHaveLength(1);
  });
});
