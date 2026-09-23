// GET  /api/internal/dashboards?orgId=xxx         — list dashboards for org
// POST /api/internal/dashboards                   — create a dashboard
//
// Auth: user session (cookie or Bearer token).
// The orgId is verified against the caller's active org so users can only
// read/create dashboards for organisations they belong to.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../../prisma/db";
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

// GET /api/internal/dashboards?orgId=xxx
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId)
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });

  // Verify caller is a member of this org.
  const member = await prisma.member.findFirst({
    where: { userId, organizationId: orgId },
  });
  if (!member)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dashboards = await prisma.dashboard.findMany({
    where: { orgId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ dashboards });
}

// POST /api/internal/dashboards
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { orgId, name, description } = body ?? {};

  if (!orgId || !name?.trim()) {
    return NextResponse.json(
      { error: "orgId and name are required" },
      { status: 400 },
    );
  }

  const member = await prisma.member.findFirst({
    where: { userId, organizationId: orgId },
  });
  if (!member)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dashboard = await prisma.dashboard.create({
    data: {
      orgId,
      userId,
      name: name.trim(),
      description: description?.trim() ?? null,
      layout: [],
    },
  });

  return NextResponse.json({ dashboard }, { status: 201 });
}
