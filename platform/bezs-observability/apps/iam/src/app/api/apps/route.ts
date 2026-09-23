// GET /api/apps  — list all applications for the authenticated org
// POST /api/apps — create a new application (slug auto-generated from name)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../prisma/db";
import { getOrgPlan, PLAN_LIMITS } from "@/modules/server/auth-provider/plan-limits";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getOrgId(session: Awaited<ReturnType<typeof auth.api.getSession>>): string | null {
  if (!session) return null;
  return (session.session as typeof session.session & { activeOrganizationId?: string | null })
    .activeOrganizationId ?? null;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "No active organisation" }, { status: 400 });

  const apps = await prisma.application.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(apps);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "No active organisation" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const slug = slugify(name);
  if (!slug) return NextResponse.json({ error: "Invalid name — could not generate slug" }, { status: 400 });

  // Enforce per-plan application limit before creating.
  const plan = await getOrgPlan(orgId);
  const appLimit = PLAN_LIMITS[plan].applications;
  const appCount = await prisma.application.count({ where: { organizationId: orgId } });
  if (appCount >= appLimit) {
    return NextResponse.json(
      { error: `Your plan allows up to ${appLimit} application${appLimit === 1 ? "" : "s"}. Upgrade your plan to create more.` },
      { status: 403 },
    );
  }

  try {
    const app = await prisma.application.create({
      data: { organizationId: orgId, name, slug },
    });
    return NextResponse.json(app, { status: 201 });
  } catch (err: unknown) {
    // Unique constraint on (organization_id, slug)
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "An app with that name already exists" }, { status: 409 });
    }
    throw err;
  }
}
