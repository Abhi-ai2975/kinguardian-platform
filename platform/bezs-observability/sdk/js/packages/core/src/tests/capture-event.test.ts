import { describe, expect, it } from "vitest";
import { EventBuffer } from "../buffer.js";
import { CaptureEventUseCase } from "../usecases/capture-event.js";

const makeUc = () => {
  const buf = new EventBuffer();
  return { uc: new CaptureEventUseCase(buf), buf };
};

describe("CaptureEventUseCase", () => {
  it("valid event is pushed to buffer", () => {
    const { uc, buf } = makeUc();
    uc.execute({ eventType: "log", severity: "info", message: "hello" });
    expect(buf.size).toBe(1);
  });

  it("empty message throws", () => {
    const { uc } = makeUc();
    expect(() => uc.execute({ eventType: "log", severity: "info", message: "" }))
      .toThrow("message is required");
  });

  it("invalid eventType throws", () => {
    const { uc } = makeUc();
    expect(() => uc.execute({ eventType: "unknown", severity: "info", message: "x" }))
      .toThrow(/invalid eventType/);
  });

  it("invalid severity throws", () => {
    const { uc } = makeUc();
    expect(() => uc.execute({ eventType: "log", severity: "verbose", message: "x" }))
      .toThrow(/invalid severity/);
  });

  it("validation failure does not modify the buffer", () => {
    const { uc, buf } = makeUc();
    try { uc.execute({ eventType: "log", severity: "info", message: "" }); } catch {}
    expect(buf.size).toBe(0);
  });

  it.each(["audit", "log", "trace", "metric", "event", "security", "ai"])(
    "accepts eventType %s",
    (eventType) => {
      const { uc, buf } = makeUc();
      uc.execute({ eventType, severity: "info", message: "x" });
      expect(buf.size).toBe(1);
    },
  );

  it.each(["debug", "info", "warn", "error", "critical"])(
    "accepts severity %s",
    (severity) => {
      const { uc, buf } = makeUc();
      uc.execute({ eventType: "log", severity, message: "x" });
      expect(buf.size).toBe(1);
    },
  );
});
