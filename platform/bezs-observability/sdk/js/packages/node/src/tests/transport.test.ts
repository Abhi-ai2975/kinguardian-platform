import { createServer } from "node:http";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeTransport } from "../transport.js";

/** Spin up a minimal HTTP server for each test to capture real requests. */
function makeTestServer(statusCode = 200): { server: Server; requests: { body: string; headers: Record<string, string> }[] } {
  const requests: { body: string; headers: Record<string, string> }[] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => {
      requests.push({ body, headers: req.headers as Record<string, string> });
      res.writeHead(statusCode);
      res.end();
    });
  });
  return { server, requests };
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve((server.address() as { port: number }).port);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

describe("NodeTransport", () => {
  let server: Server;
  let requests: { body: string; headers: Record<string, string> }[];
  let port: number;

  beforeEach(async () => {
    ({ server, requests } = makeTestServer(200));
    port = await listen(server);
  });

  afterEach(async () => {
    await close(server);
  });

  it("POST /v1/events with correct headers and body", async () => {
    const t = new NodeTransport(`http://127.0.0.1:${port}`, "wtch_test", "test-app", "test");
    await t.send([{ eventType: "log", severity: "info", message: "hello" }]);

    expect(requests).toHaveLength(1);
    const req = requests[0]!;
    expect(req.headers["authorization"]).toBe("Bearer wtch_test");
    expect(req.headers["x-app-id"]).toBe("test-app");
    expect(req.headers["content-type"]).toBe("application/json");
    const body = JSON.parse(req.body) as unknown[];
    expect(body).toHaveLength(1);
    expect((body[0] as { message: string }).message).toBe("hello");
  });

  it("sends batch of multiple events in one request", async () => {
    const t = new NodeTransport(`http://127.0.0.1:${port}`, "wtch_test", "test-app", "test");
    await t.send([
      { eventType: "log", severity: "info", message: "one" },
      { eventType: "audit", severity: "info", message: "two" },
    ]);

    const body = JSON.parse(requests[0]!.body) as unknown[];
    expect(body).toHaveLength(2);
  });

  it("4xx response does not throw", async () => {
    await close(server);
    ({ server, requests } = makeTestServer(401));
    port = await listen(server);

    const t = new NodeTransport(`http://127.0.0.1:${port}`, "bad_key", "app", "prod");
    await expect(t.send([{ eventType: "log", severity: "info", message: "x" }])).resolves.toBeUndefined();
  });
});
