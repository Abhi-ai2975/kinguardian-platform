import { describe, expect, it, vi } from "vitest";

// Stub next/server before importing middleware — Next.js is a peer dep not installed here.
vi.mock("next/server", () => ({
  NextResponse: {
    next: () => new Response(null, { status: 200 }),
  },
}));

// Stub @watcher/node so no real HTTP calls are made.
const auditMock = vi.fn();
const traceMock = vi.fn();
const shutdownMock = vi.fn();
vi.mock("@watcher/node", () => ({
  createNodeClient: () => ({
    audit: auditMock,
    trace: traceMock,
    shutdown: shutdownMock,
  }),
}));

const { watcherMiddleware } = await import("../middleware.js");

function makeRequest(path: string, traceId?: string): Request {
  const headers: Record<string, string> = {};
  if (traceId) headers["x-trace-id"] = traceId;
  return new Request(`http://localhost${path}`, { headers });
}

describe("watcherMiddleware", () => {
  it("returns a response", async () => {
    const middleware = watcherMiddleware({ apiKey: "wtch_test", appId: "app" });
    const res = await middleware(makeRequest("/api/orders") as never);
    expect(res?.status).toBe(200);
  });

  it("calls client.trace with method and path", async () => {
    traceMock.mockClear();
    const middleware = watcherMiddleware({ apiKey: "wtch_test", appId: "app" });
    await middleware(makeRequest("/api/users") as never);

    expect(traceMock).toHaveBeenCalledOnce();
    const [, opts] = traceMock.mock.calls[0] as [string, { payload: Record<string, unknown> }];
    expect(opts.payload["path"]).toBe("/api/users");
    expect(opts.payload["method"]).toBe("GET");
  });

  it("propagates x-trace-id header to trace call", async () => {
    traceMock.mockClear();
    const middleware = watcherMiddleware({ apiKey: "wtch_test", appId: "app" });
    await middleware(makeRequest("/api/x", "my-trace-id") as never);

    const [, opts] = traceMock.mock.calls[0] as [string, { traceId: string }];
    expect(opts.traceId).toBe("my-trace-id");
  });

  it("generates a trace ID when header is absent", async () => {
    traceMock.mockClear();
    const middleware = watcherMiddleware({ apiKey: "wtch_test", appId: "app" });
    await middleware(makeRequest("/api/x") as never);

    const [, opts] = traceMock.mock.calls[0] as [string, { traceId: string }];
    expect(opts.traceId).toBeTruthy();
    expect(opts.traceId).toHaveLength(36); // UUID4
  });
});
