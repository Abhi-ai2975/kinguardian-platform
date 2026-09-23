// GET /api/notifications/stream — proxies the notifier's SSE endpoint to the
// browser with session-based auth.
//
// The notifier's internal SSE endpoint requires X-Internal-Secret. This route
// authenticates via the console session cookie and forwards the stream, so the
// browser never sees the secret and never connects to notifier-go directly.
//
// The response is a long-lived text/event-stream. Each event has the shape:
//   data: {"type":"notification"}
//
// Clients should refetch GET /api/notifications on receiving this event.
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";

const notifierUrl = () => process.env.NOTIFIER_URL ?? "http://localhost:4004";
const internalSecret = () => process.env.NOTIFIER_INTERNAL_SECRET ?? "change-me";

export const dynamic = "force-dynamic";
// Disable Next.js body buffering so the SSE stream is forwarded in real time.
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const orgId = session.session.activeOrganizationId;
  if (!orgId) {
    return new NextResponse("No active org", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${notifierUrl()}/api/internal/notifications/events?org_id=${orgId}`,
      {
        headers: { "X-Internal-Secret": internalSecret() },
        // Disable Next.js / Node.js response body buffering.
        cache: "no-store",
        // @ts-expect-error — Node.js fetch extension for streaming
        duplex: "half",
      },
    );
  } catch {
    // Notifier is not running — return an error so EventSource retries later.
    return new NextResponse("Notifier unavailable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Notifier unavailable", { status: 502 });
  }

  // Pass the upstream ReadableStream directly to the browser without buffering.
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tell nginx/Caddy not to buffer the SSE stream.
      "X-Accel-Buffering": "no",
    },
  });
}
