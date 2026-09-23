/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserTransport } from "../transport.js";

function makeFetch(status = 200): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status });
}

describe("BrowserTransport", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetch(200));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetch with correct URL and headers", async () => {
    const t = new BrowserTransport("http://localhost:8080", "wtch_test", "my-app", "production");
    await t.send([{ eventType: "log", severity: "info", message: "hello" }]);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8080/v1/events");
    expect((init.headers as Record<string, string>)["authorization"]).toBe("Bearer wtch_test");
    expect((init.headers as Record<string, string>)["x-app-id"]).toBe("my-app");
    const body = JSON.parse(init.body as string) as unknown[];
    expect(body).toHaveLength(1);
  });

  it("sends batch of multiple events in one fetch", async () => {
    const t = new BrowserTransport("http://localhost:8080", "wtch_test", "app", "prod");
    await t.send([
      { eventType: "log", severity: "info", message: "one" },
      { eventType: "audit", severity: "info", message: "two" },
    ]);
    const body = JSON.parse(
      ((fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1].body as string
    ) as unknown[];
    expect(body).toHaveLength(2);
  });

  it("4xx response does not throw", async () => {
    vi.stubGlobal("fetch", makeFetch(401));
    const t = new BrowserTransport("http://localhost:8080", "bad", "app", "prod");
    await expect(t.send([{ eventType: "log", severity: "info", message: "x" }])).resolves.toBeUndefined();
  });
});
