import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../prisma/db";
import { auth } from "@/modules/server/auth-provider/auth";
import { verifyAccessToken } from "@/lib/verifyAccessToken";

export async function PATCH(req: NextRequest) {
  let userId: string | undefined;

  // 1. Try session (browser)
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (session?.user?.id) {
    userId = session.user.id;
  }

  // 2. Fallback to Bearer token (mobile)
  if (!userId) {
    const authHeader = req.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      const result = await verifyAccessToken(token);

      // invalid case
      if (!result.valid) {
        return NextResponse.json(
          {
            error: result.code,
            message: result.message,
          },
          { status: result.status },
        );
      }

      // valid
      userId = result?.payload?.sub as string;
    }
  }

  // Still no auth
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Continue same as before
  const body = await req.json();
  const { orgId } = body;

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  // Authorization
  const membership = await prisma.member.findFirst({
    where: {
      userId,
      organizationId: orgId,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Update context
  const context = await prisma.userContext.upsert({
    where: { userId },
    create: { userId, activeOrganizationId: orgId },
    update: { activeOrganizationId: orgId },
  });

  return NextResponse.json({
    activeOrganizationId: context.activeOrganizationId,
  });
}
