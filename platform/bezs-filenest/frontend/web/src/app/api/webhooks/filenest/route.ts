/**
 * POST /api/webhooks/filenest — receives FileNest event webhook payloads.
 *
 * All incoming requests are verified against the x-filenest-signature header
 * before any payload processing occurs. Requests with missing or invalid
 * signatures are rejected with 401.
 *
 * Supported events (Phase 2+):
 *   file.uploaded     — a file record was created and upload URL issued
 *   file.processed    — all processing pipeline stages completed
 *   file.virus_detected — file quarantined after virus scan
 *
 * @module
 */
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify the HMAC-SHA256 signature on the raw request body.
 *
 * Uses timingSafeEqual to prevent timing attacks. Returns true only if the
 * computed digest matches the value in x-filenest-signature.
 */
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    // Buffer lengths differ — signature is malformed.
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-filenest-signature") ?? "";
  const secret = process.env.FILENEST_WEBHOOK_SECRET ?? "";

  if (!secret) {
    console.error("FILENEST_WEBHOOK_SECRET is not set — rejecting all webhooks");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type: string; data: unknown };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Phase 2+: dispatch event handlers here.
  switch (event.type) {
    case "file.uploaded":
      // TODO: trigger any post-upload business logic
      break;
    case "file.processed":
      // TODO: notify UI via Server-Sent Events or update cache
      break;
    case "file.virus_detected":
      // TODO: alert admins, update file record in UI cache
      break;
    default:
      // Unknown event types are accepted but not acted on.
      break;
  }

  return NextResponse.json({ received: true });
}
