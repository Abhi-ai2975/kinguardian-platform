// POST /api/internal/organization/set-active
//
// Atomically sets a user's active organisation in both places that need it:
//   1. better-auth session  — so the browser cookie reflects the active org
//   2. userContext table    — so the gateway can resolve API-key → org_id
//
// Without step 2, API keys whose referenceId is a user ID resolve to a null
// org and events are published to the wrong Redis channel, breaking the
// live feed and dashboard charts.
//
// Auth: user session (cookie or Bearer token) — this acts on behalf of the
// requesting user, not as a service-to-service call, so no X-Internal-Secret.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../../../prisma/db";
import { verifyAccessToken } from "@/lib/verifyAccessToken";

export async function POST(req: NextRequest) {
  // ── 1. Identify the user ──────────────────────────────────────────────────
  let userId: string | undefined;

  const session = await auth.api.getSession({ headers: req.headers });
  if (session?.user?.id) {
    userId = session.user.id;
  }

  if (!userId) {
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
      userId = result.payload?.sub as string;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Validate input ─────────────────────────────────────────────────────
  const body = await req.json().catch(() => null);
  const organizationId: string | undefined = body?.organizationId;

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 },
    );
  }

  // ── 3. Verify membership ──────────────────────────────────────────────────
  // Only members of the org can set it as their active org.
  const membership = await prisma.member.findFirst({
    where: { userId, organizationId },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "User is not a member of this organisation" },
      { status: 403 },
    );
  }

  // ── 4. Call better-auth set-active ────────────────────────────────────────
  // Updates the session cookie so the browser reflects the active org.
  const baRes = await auth.api.setActiveOrganization({
    body: { organizationId },
    headers: req.headers,
  });

  // ── 5. Update userContext ─────────────────────────────────────────────────
  // The gateway joins apikey → userContext to resolve org_id at ingestion time.
  // Without this upsert, server-side SDK keys whose referenceId is a user ID
  // will always resolve to an empty org, publishing events to the wrong channel.
  await prisma.userContext.upsert({
    where: { userId },
    create: { userId, activeOrganizationId: organizationId },
    update: { activeOrganizationId: organizationId },
  });

  // Forward the Set-Cookie headers from better-auth so the console can relay
  // them to the browser, keeping the session cookie in sync.
  const response = NextResponse.json({ organizationId });

  const setCookie = (baRes as Response).headers?.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}
