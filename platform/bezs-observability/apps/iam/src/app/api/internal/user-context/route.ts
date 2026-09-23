import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/db";
import { auth } from "@/modules/server/auth-provider/auth";
import { verifyAccessToken } from "@/lib/verifyAccessToken";

// ------------------------------------------------------------------ //
// Auth helper — shared by all handlers in this file
// Returns userId or a ready-made error response.
// ------------------------------------------------------------------ //

async function resolveUserId(
  req: NextRequest,
): Promise<{ userId: string } | NextResponse> {
  // 1. Try session (browser)
  const session = await auth.api.getSession({ headers: req.headers });
  if (session?.user?.id) {
    return { userId: session.user.id };
  }

  // 2. Fallback to Bearer token (mobile / API clients)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1]!;
    const result = await verifyAccessToken(token);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.code, message: result.message },
        { status: result.status },
      );
    }

    return { userId: result.payload!.sub as string };
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// ------------------------------------------------------------------ //
// GET /api/internal/user-context
//
// Returns the authenticated user's profile and context.
//
// Query params (all optional):
//   orgId  — when provided, also checks org membership and returns it.
//             Responds 403 if the user is not a member.
// ------------------------------------------------------------------ //

export async function GET(req: NextRequest) {
  const auth_result = await resolveUserId(req);
  if (auth_result instanceof NextResponse) return auth_result;
  const { userId } = auth_result;

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId") ?? undefined;

  // Fetch user — optionally scoped to an org membership
  const user = orgId
    ? await prisma.user.findUnique({
        where: {
          id: userId,
          members: { some: { organizationId: orgId } },
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
          role: true,
          emailVerified: true,
          banned: true,
          createdAt: true,
        },
      })
    : await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
          role: true,
          emailVerified: true,
          banned: true,
          createdAt: true,
        },
      });

  if (!user) {
    // With orgId: user exists but isn't a member — 403
    // Without orgId: user doesn't exist at all — 404
    const status = orgId ? 403 : 404;
    const error = orgId ? "Forbidden" : "User not found";
    return NextResponse.json({ error }, { status });
  }

  // Fetch the user's active context
  const context = await prisma.userContext.findUnique({
    where: { userId },
    select: {
      activeOrganizationId: true,
      activeRoleId: true,
    },
  });

  // Optionally include membership details when orgId was provided
  const membership = orgId
    ? await prisma.member.findFirst({
        where: { userId, organizationId: orgId },
        select: { id: true, role: true, createdAt: true },
      })
    : undefined;

  return NextResponse.json({
    user,
    context: context ?? null,
    ...(orgId !== undefined && { membership: membership ?? null }),
  });
}

// ------------------------------------------------------------------ //
// GET /api/internal/user-context?lookup=true
//
// Lookup a user by email or username (without requiring the caller to
// be that user). Useful for cross-service user resolution.
//
// Query params (at least one of email / username required):
//   email    — exact email match
//   username — exact username match
//   orgId    — when provided, user must be a member of this org
// ------------------------------------------------------------------ //

export async function POST(req: NextRequest) {
  const auth_result = await resolveUserId(req);
  if (auth_result instanceof NextResponse) return auth_result;

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, username, orgId } = body as {
    email?: string;
    username?: string;
    orgId?: string;
  };

  if (!email && !username) {
    return NextResponse.json(
      { error: "Provide at least one of: email, username" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(username ? [{ username }] : []),
      ],
      ...(orgId
        ? { members: { some: { organizationId: orgId } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      image: true,
      role: true,
      emailVerified: true,
      banned: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
