/**
 * @vitest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import type { Client } from "@watcher/core";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { WatcherProvider, useAudit, useLog, useMetric, useTrace, useWatcher } from "../index.js";

function makeClient(): Client {
  return {
    audit: vi.fn(),
    log: vi.fn(),
    trace: vi.fn(),
    metric: vi.fn(),
    event: vi.fn(),
    flush: vi.fn(),
    shutdown: vi.fn(),
  } as unknown as Client;
}

function wrapper(client: Client) {
  return ({ children }: { children: ReactNode }) => (
    <WatcherProvider client={client}>{children}</WatcherProvider>
  );
}

describe("useWatcher", () => {
  it("returns the client from context", () => {
    const client = makeClient();
    const { result } = renderHook(() => useWatcher(), { wrapper: wrapper(client) });
    expect(result.current).toBe(client);
  });

  it("throws outside WatcherProvider", () => {
    expect(() => renderHook(() => useWatcher())).toThrow("useWatcher must be called inside a <WatcherProvider>");
  });
});

describe("useAudit", () => {
  it("calls client.audit with correct args", () => {
    const client = makeClient();
    const { result } = renderHook(() => useAudit(), { wrapper: wrapper(client) });
    result.current("user.login", { userId: "u1" });
    expect(client.audit).toHaveBeenCalledWith("user.login", { userId: "u1" });
  });
});

describe("useLog", () => {
  it("calls client.log with severity and message", () => {
    const client = makeClient();
    const { result } = renderHook(() => useLog(), { wrapper: wrapper(client) });
    result.current("error", "something failed");
    expect(client.log).toHaveBeenCalledWith("error", "something failed", undefined);
  });
});

describe("useTrace", () => {
  it("calls client.trace", () => {
    const client = makeClient();
    const { result } = renderHook(() => useTrace(), { wrapper: wrapper(client) });
    result.current("db.query", { traceId: "t1" });
    expect(client.trace).toHaveBeenCalledWith("db.query", { traceId: "t1" });
  });
});

describe("useMetric", () => {
  it("calls client.metric", () => {
    const client = makeClient();
    const { result } = renderHook(() => useMetric(), { wrapper: wrapper(client) });
    result.current("api.latency", { payload: { value: 42 } });
    expect(client.metric).toHaveBeenCalledWith("api.latency", { payload: { value: 42 } });
  });
});
