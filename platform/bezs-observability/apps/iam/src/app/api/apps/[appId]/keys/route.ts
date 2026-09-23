// GET /api/apps/[appId]/keys  — list API keys linked to a specific application
// POST /api/apps/[appId]/keys — link an existing API key to this application
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../../../prisma/db";

function getOrgId(session: Awaited<ReturnType<typeof auth.api.getSession>>): string | null {
  if (!session) return null;
  return (session.session as typeof session.session & { activeOrganizationId?: string | null })
    .activeOrganizationId ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "No active organisation" }, { status: 400 });

  const { appId } = await params;

  // Verify the app belongs to this org
  const app = await prisma.application.findFirst({
    where: { id: appId, organizationId: orgId },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const keys = await prisma.apikey.findMany({
    where: { appId },
    select: {
      id: true,
      name: true,
      start: true,
      appId: true,
      createdAt: true,
      expiresAt: true,
      enabled: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "No active organisation" }, { status: 400 });

  const { appId } = await params;

  // Verify the app belongs to this org
  const app = await prisma.application.findFirst({
    where: { id: appId, organizationId: orgId },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const keyId = typeof body?.keyId === "string" ? body.keyId : null;
  if (!keyId) return NextResponse.json({ error: "keyId is required" }, { status: 400 });

  await prisma.apikey.update({
    where: { id: keyId },
    data: { appId },
  });

  return NextResponse.json({ ok: true });
}
