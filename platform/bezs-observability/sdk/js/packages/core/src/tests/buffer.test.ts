import { describe, expect, it } from "vitest";
import { EventBuffer } from "../buffer.js";
import type { EventInput } from "../domain/event.js";

const evt = (msg = "x"): EventInput => ({ eventType: "log", severity: "info", message: msg });

describe("EventBuffer", () => {
  it("push increases size", () => {
    const buf = new EventBuffer();
    buf.push(evt());
    expect(buf.size).toBe(1);
  });

  it("drain returns all events in order", () => {
    const buf = new EventBuffer();
    buf.push(evt("a"));
    buf.push(evt("b"));
    const events = buf.drain();
    expect(events).toHaveLength(2);
    expect(events[0]?.message).toBe("a");
    expect(events[1]?.message).toBe("b");
  });

  it("drain clears the buffer", () => {
    const buf = new EventBuffer();
    buf.push(evt());
    buf.drain();
    expect(buf.size).toBe(0);
  });

  it("drain on empty buffer returns empty array", () => {
    expect(new EventBuffer().drain()).toEqual([]);
  });

  it("exceeding maxSize drops the oldest event", () => {
    const buf = new EventBuffer(3);
    for (let i = 0; i < 5; i++) buf.push(evt(String(i)));
    const events = buf.drain();
    expect(events).toHaveLength(3);
    expect(events[0]?.message).toBe("2");
    expect(events[2]?.message).toBe("4");
  });

  it("exactly at maxSize does not drop", () => {
    const buf = new EventBuffer(3);
    for (let i = 0; i < 3; i++) buf.push(evt(String(i)));
    expect(buf.size).toBe(3);
  });
});
