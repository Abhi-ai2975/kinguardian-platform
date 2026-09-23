"use client";

/**
 * /webhooks — Webhook event log demo.
 *
 * Polls the in-memory webhook log stored by /api/webhooks/filenest and
 * renders each received event. Shows how to wire up signature verification
 * and parseWebhookEvent() in the route handler.
 */

import { CodeBlock } from "@/components/CodeBlock";
import { useEffect, useState } from "react";

interface StoredEvent {
  id: string;
  type: string;
  receivedAt: string;
  payload: unknown;
}

const ROUTE_HANDLER_SOURCE = `// app/api/webhooks/filenest/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  parseWebhookEvent,
} from "@filenest/nextjs/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-filenest-signature") ?? "";
  const secret = process.env.FILENEST_WEBHOOK_SECRET!;

  const valid = verifyWebhookSignature(rawBody, signature, secret);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = parseWebhookEvent(JSON.parse(rawBody));

  switch (event.type) {
    case "file.uploaded":
      console.log("New file:", event.data.fileId);
      break;
    case "file.ready":
      console.log("Processing done:", event.data.fileId);
      break;
    case "file.virus_detected":
      console.warn("VIRUS:", event.data.filename);
      break;
    default:
      // exhaustive — all event types handled above
      break;
  }

  return NextResponse.json({ received: true });
}`;

const TRIGGER_SOURCE = `# Trigger a test event with cURL
curl -X POST http://localhost:3000/api/webhooks/filenest \\
  -H "Content-Type: application/json" \\
  -H "x-filenest-signature: <HMAC-SHA256 of body>" \\
  -d '{
    "type": "file.uploaded",
    "data": {
      "fileId": "file_abc123",
      "filename": "report.pdf",
      "projectId": "proj_xyz"
    }
  }'`;

const EVENT_TYPE_COLORS: Record<string, string> = {
  "file.uploaded": "badge-blue",
  "file.ready": "badge-green",
  "file.processed": "badge-green",
  "file.deleted": "badge-red",
  "file.virus_detected": "badge-yellow",
};

export default function WebhooksPage() {
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [polling, setPolling] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchLog = async () => {
    try {
      const res = await fetch("/api/webhooks/filenest/log");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
        setLastFetched(new Date().toLocaleTimeString());
      }
    } catch {
      // silently ignore fetch errors
    }
  };

  useEffect(() => {
    if (!polling) return;
    fetchLog();
    const interval = setInterval(fetchLog, 3000);
    return () => clearInterval(interval);
  }, [polling]);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>Webhooks</h1>
          <span className="badge badge-blue">@filenest/nextjs</span>
        </div>
        <p className="page-sub">
          <code>verifyWebhookSignature</code> validates the HMAC-SHA256 signature on every incoming
          request. <code>parseWebhookEvent</code> gives you a typed union so each event type is
          handled exhaustively. The event log below reads from the in-memory store maintained by
          the route handler.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Event log */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <div>
                <div className="card-title">Live event log</div>
                <div className="card-desc">
                  {lastFetched ? `Last fetched: ${lastFetched}` : "Start polling to see events"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`btn btn-sm ${polling ? "btn-outline" : "btn-primary"}`}
                  onClick={() => setPolling((p) => !p)}
                >
                  {polling ? "Stop polling" : "Start polling (3s)"}
                </button>
                <button type="button" className="btn btn-sm btn-outline" onClick={fetchLog}>
                  Refresh now
                </button>
              </div>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="card-body text-sm text-muted">
              No events received yet. Send a test webhook to{" "}
              <code>/api/webhooks/filenest</code> (see cURL example below).
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Event ID</th>
                  <th>Received at</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <span className={`badge ${EVENT_TYPE_COLORS[ev.type] ?? "badge-gray"}`}>
                        {ev.type}
                      </span>
                    </td>
                    <td className="font-mono text-sm text-muted">{ev.id}</td>
                    <td className="text-sm text-muted">
                      {new Date(ev.receivedAt).toLocaleTimeString()}
                    </td>
                    <td>
                      <pre style={{ fontSize: 11, margin: 0 }}>
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Code examples side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <CodeBlock title="app/api/webhooks/filenest/route.ts" code={ROUTE_HANDLER_SOURCE} />
          <CodeBlock title="Test with cURL" code={TRIGGER_SOURCE} />
        </div>

        {/* Event types reference */}
        <div className="card">
          <div className="card-header"><div className="card-title">Event types</div></div>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>When</th>
                <th>Key data fields</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["file.uploaded", "File record created in DB", "fileId, filename, size, mimeType"],
                ["file.ready", "All processing stages passed", "fileId, filename, processingResults"],
                ["file.processed", "A processing stage completed", "fileId, stage, result"],
                ["file.deleted", "File soft-deleted or hard-deleted", "fileId, filename, deletedBy"],
                ["file.virus_detected", "ClamAV found a threat", "fileId, filename, threatName"],
              ].map(([type, when, fields]) => (
                <tr key={type}>
                  <td>
                    <span className={`badge ${EVENT_TYPE_COLORS[type] ?? "badge-gray"}`}>
                      {type}
                    </span>
                  </td>
                  <td className="text-sm text-muted">{when}</td>
                  <td className="font-mono text-sm text-muted">{fields}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
