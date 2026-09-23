// GET /api/notifications — list in-app notifications for the authenticated org.
// Proxies to notifier-go GET /api/internal/notifications with the internal secret.
// The console never exposes the notifier directly; this route adds session auth.
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";

const notifierUrl = () => process.env.NOTIFIER_URL ?? "http://localhost:4004";
const internalSecret = () => process.env.NOTIFIER_INTERNAL_SECRET ?? "change-me";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.session.activeOrganizationId;
  if (!orgId) {
    return NextResponse.json({ notifications: [], unread_count: 0 });
  }

  try {
    const res = await fetch(
      `${notifierUrl()}/api/internal/notifications?org_id=${orgId}&limit=20`,
      {
        headers: { "X-Internal-Secret": internalSecret() },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("[/api/notifications GET]", err);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// PATCH /api/notifications/read-all — mark all notifications as read.
export async function PATCH() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.session.activeOrganizationId;
  if (!orgId) {
    return NextResponse.json({ ok: true });
  }

  try {
    const res = await fetch(
      `${notifierUrl()}/api/internal/notifications/read-all?org_id=${orgId}`,
      {
        method: "PATCH",
        headers: { "X-Internal-Secret": internalSecret() },
      }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to mark all read" }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/notifications PATCH]", err);
    return NextResponse.json({ error: "Failed to mark all read" }, { status: 500 });
  }
}
