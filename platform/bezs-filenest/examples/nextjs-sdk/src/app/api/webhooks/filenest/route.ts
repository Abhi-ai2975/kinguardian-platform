/**
 * POST /api/webhooks/filenest
 *
 * Receives and verifies incoming webhook deliveries from FileNest.
 * Uses verifyWebhookSignature (HMAC-SHA256) then parseWebhookEvent to get
 * a typed event object. Stores events in a simple in-memory log for the demo.
 */

import { verifyWebhookSignature, parseWebhookEvent } from "@filenest/nextjs/server";

// In-memory log for the demo UI — replace with a real DB in production.
export const webhookLog: { receivedAt: string; event: ReturnType<typeof parseWebhookEvent> }[] = [];

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-filenest-signature") ?? "";

  // Always verify the signature before processing the payload.
  const isValid = verifyWebhookSignature(
    body,
    signature,
    process.env.FILENEST_WEBHOOK_SECRET!
  );

  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = parseWebhookEvent(body);

  // Store in demo log (capped at 50 entries)
  webhookLog.unshift({ receivedAt: new Date().toISOString(), event });
  if (webhookLog.length > 50) webhookLog.pop();

  // Handle specific event types
  switch (event.type) {
    case "file.uploaded":
      console.log(`[webhook] file.uploaded — ${event.data.filename}`);
      break;
    case "file.processed":
      console.log(`[webhook] file.processed — ${event.data.filename} → ${event.data.status}`);
      break;
    case "file.virus_detected":
      console.log(`[webhook] file.virus_detected — ${event.data.filename} (${event.data.virusName})`);
      break;
    default:
      console.log(`[webhook] ${event.type}`);
  }

  return new Response("OK", { status: 200 });
}
