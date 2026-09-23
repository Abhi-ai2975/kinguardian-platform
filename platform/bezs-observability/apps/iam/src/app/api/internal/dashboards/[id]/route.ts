// GET    /api/internal/dashboards/[id]  — fetch one dashboard (layout included)
// PUT    /api/internal/dashboards/[id]  — update name, description, or layout
// DELETE /api/internal/dashboards/[id]  — delete (owner or org admin only)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../../../prisma/db";
import { verifyAccessToken } from "@/lib/verifyAccessToken";

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (session?.user?.id) return session.user.id;

  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const result = await verifyAccessToken(header.split(" ")[1]);
    if (result.valid) return result.payload?.sub as string;
  }
  return null;
}

// Resolve the dashboard and verify the caller is a member of its org.
async function resolveDashboard(id: string, userId: string) {
  const dashboard = await prisma.dashboard.findUnique({ where: { id } });
  if (!dashboard) return { dashboard: null, member: null };

  const member = await prisma.member.findFirst({
    where: { userId, organizationId: dashboard.orgId },
  });
  return { dashboard, member };
}

// GET /api/internal/dashboards/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { dashboard, member } = await resolveDashboard(id, userId);

  if (!dashboard)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!member)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ dashboard });
}

// PUT /api/internal/dashboards/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { dashboard, member } = await resolveDashboard(id, userId);

  if (!dashboard)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!member)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { name, description, layout } = body;

  const updated = await prisma.dashboard.update({
    where: { id },
    data: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(description !== undefined
        ? { description: description ?? null }
        : {}),
      ...(layout !== undefined ? { layout } : {}),
    },
  });

  return NextResponse.json({ dashboard: updated });
}

// DELETE /api/internal/dashboards/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { dashboard, member } = await resolveDashboard(id, userId);

  if (!dashboard)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!member)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Only the creator or an org admin/owner may delete.
  const isOwner = dashboard.userId === userId;
  const isAdmin = member.role === "admin" || member.role === "owner";
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "Only the dashboard creator or an org admin can delete it" },
      { status: 403 },
    );
  }

  await prisma.dashboard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
