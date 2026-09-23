/**
 * GET /api/webhooks/filenest/log
 *
 * Returns the in-memory webhook event log for the demo UI (/webhooks page).
 * Not for production use — the parent route handler owns the shared log array.
 */

import { webhookLog } from "../route";

export async function GET() {
  const events = webhookLog.map((entry, i) => ({
    id: `evt_${Date.now()}_${i}`,
    type: entry.event.type,
    receivedAt: entry.receivedAt,
    payload: entry.event.data,
  }));

  return Response.json({ events });
}
