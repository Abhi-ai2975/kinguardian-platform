// PATCH /api/notifications/[id]/read — mark a single in-app notification as read.
// Proxies to notifier-go PATCH /api/internal/notifications/:id/read.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";

const notifierUrl = () => process.env.NOTIFIER_URL ?? "http://localhost:4004";
const internalSecret = () => process.env.NOTIFIER_INTERNAL_SECRET ?? "change-me";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.session.activeOrganizationId;
  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  const { id } = await params;

  try {
    const res = await fetch(
      `${notifierUrl()}/api/internal/notifications/${id}/read?org_id=${orgId}`,
      {
        method: "PATCH",
        headers: { "X-Internal-Secret": internalSecret() },
      }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to mark as read" }, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/notifications/[id]/read PATCH]", err);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
