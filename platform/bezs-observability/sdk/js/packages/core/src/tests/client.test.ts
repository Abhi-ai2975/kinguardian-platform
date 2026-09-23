import { describe, expect, it } from "vitest";
import { EventBuffer } from "../buffer.js";
import { Client } from "../client.js";
import type { EventInput } from "../domain/event.js";
import { BackgroundFlusher } from "../flusher.js";
import type { Transport } from "../ports/transport.js";
import { CaptureEventUseCase } from "../usecases/capture-event.js";
import { FlushBufferUseCase } from "../usecases/flush-buffer.js";

class FakeTransport implements Transport {
  sent: EventInput[] = [];
  async send(events: EventInput[]): Promise<void> {
    this.sent.push(...events);
  }
}

/** Build a Client wired to FakeTransport, bypassing real HTTP. */
function makeClient(): { client: Client; transport: FakeTransport; flush: () => Promise<void> } {
  const transport = new FakeTransport();
  const buf = new EventBuffer();
  const captureUc = new CaptureEventUseCase(buf);
  const flushUc = new FlushBufferUseCase(buf, transport);

  // No-op flusher — we control flushes manually in tests.
  const noopFlusher = {
    start: () => {},
    stop: async () => { await flushUc.execute(); },
    checkSizeTrigger: () => {},
  } as unknown as BackgroundFlusher;

  const client = Object.assign(Object.create(Client.prototype), {
    capture: captureUc,
    flushUseCase: flushUc,
    flusher: noopFlusher,
  }) as Client;

  return { client, transport, flush: () => flushUc.execute().then(() => undefined) };
}

describe("Client", () => {
  it("audit sends event with correct type", async () => {
    const { client, transport, flush } = makeClient();
    client.audit("user.login", { userId: "u1" });
    await flush();
    expect(transport.sent[0]?.eventType).toBe("audit");
    expect(transport.sent[0]?.message).toBe("user.login");
    expect(transport.sent[0]?.userId).toBe("u1");
  });

  it("log sends event with correct severity", async () => {
    const { client, transport, flush } = makeClient();
    client.log("error", "db failed");
    await flush();
    expect(transport.sent[0]?.eventType).toBe("log");
    expect(transport.sent[0]?.severity).toBe("error");
  });

  it("trace sets traceId spanId parentSpanId", async () => {
    const { client, transport, flush } = makeClient();
    client.trace("db.query", { traceId: "t1", spanId: "s1", parentSpanId: "s0" });
    await flush();
    const e = transport.sent[0]!;
    expect(e.traceId).toBe("t1");
    expect(e.spanId).toBe("s1");
    expect(e.parentSpanId).toBe("s0");
  });

  it("metric sets payload", async () => {
    const { client, transport, flush } = makeClient();
    client.metric("api.latency", { payload: { value: 42, unit: "ms" } });
    await flush();
    expect(transport.sent[0]?.payload?.["value"]).toBe(42);
  });

  it("event accepts extended event types", async () => {
    const { client, transport, flush } = makeClient();
    client.event("security", "critical", "brute force", { payload: { ip: "1.2.3.4" } });
    await flush();
    expect(transport.sent[0]?.eventType).toBe("security");
    expect(transport.sent[0]?.severity).toBe("critical");
  });

  it("shutdown flushes remaining events", async () => {
    const { client, transport } = makeClient();
    client.audit("before.shutdown");
    await client.shutdown();
    expect(transport.sent).toHaveLength(1);
  });

  it("missing apiKey throws", () => {
    const t = new FakeTransport();
    expect(() => new Client(t, { apiKey: "", appId: "x" })).toThrow("apiKey is required");
  });

  it("missing appId throws", () => {
    const t = new FakeTransport();
    expect(() => new Client(t, { apiKey: "wtch_x", appId: "" })).toThrow("appId is required");
  });
});
