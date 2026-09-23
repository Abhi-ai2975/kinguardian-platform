import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../../prisma/db";

/**
 * GET /api/admin/org-members?orgId=<id>&rolename=<role>
 *
 * Returns all users in the given organization that have the specified role.
 * Requires an authenticated session with admin or superadmin role.
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeRole = (
    session.session as typeof session.session & { activeRole?: string | null }
  ).activeRole;
  if (activeRole !== "superadmin" && activeRole !== "application-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId");
  const rolename = req.nextUrl.searchParams.get("rolename");

  if (!orgId || !rolename) {
    return NextResponse.json(
      { error: "Missing required query params: orgId, rolename" },
      { status: 400 },
    );
  }

  const members = await prisma.member.findMany({
    where: {
      organizationId: orgId,
      role: rolename,
    },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = members.map((m) => ({
    memberId: m.id,
    role: m.role,
    joinedAt: m.createdAt,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
  }));

  return NextResponse.json({ members: result });
}
