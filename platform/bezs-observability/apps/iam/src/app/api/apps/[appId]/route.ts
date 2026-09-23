// DELETE /api/apps/[appId] — delete an application.
// Linked API keys have their app_id set to NULL (ON DELETE SET NULL) — they are not deleted.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../../prisma/db";

function getOrgId(session: Awaited<ReturnType<typeof auth.api.getSession>>): string | null {
  if (!session) return null;
  return (session.session as typeof session.session & { activeOrganizationId?: string | null })
    .activeOrganizationId ?? null;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "No active organisation" }, { status: 400 });

  const { appId } = await params;

  // Verify ownership before deleting
  const app = await prisma.application.findFirst({
    where: { id: appId, organizationId: orgId },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.application.delete({ where: { id: appId } });

  return new NextResponse(null, { status: 204 });
}
