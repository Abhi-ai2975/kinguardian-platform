// GET /api/internal/orgs/retention
// Returns every org's retention window based on their active subscription plan.
// Called nightly by the analytics-python retention scheduler to know how far
// back to keep data for each organisation before purging ClickHouse events.
//
// Plan → retentionDays mapping (mirrors the plans UI):
//   enterprise → 365 days
//   pro        → 90 days
//   free       → 7 days  (default when no active subscription)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../prisma/db";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

// Plan priority for tie-breaking when an org has multiple active subscriptions.
// Lower number = higher tier.
const PLAN_PRIORITY: Record<string, number> = {
  enterprise: 1,
  pro: 2,
  free: 3,
};

// How many days of events to retain per plan tier.
const PLAN_RETENTION_DAYS: Record<string, number> = {
  enterprise: 365,
  pro: 90,
  free: 7,
};

export async function GET(req: NextRequest) {
  if (INTERNAL_SECRET) {
    const secret = req.headers.get("x-internal-secret");
    if (secret !== INTERNAL_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Fetch all organisations. Even orgs with no subscription get a row
  // so the retention worker knows to apply the free-tier window.
  const orgs = await prisma.organization.findMany({
    select: { id: true },
  });

  // All active subscriptions. referenceId is the org ID for org-level
  // subscriptions (the pattern better-auth uses).
  const activeSubs = await prisma.subscription.findMany({
    where: { status: { in: ["active", "trialing"] } },
    select: { referenceId: true, plan: true },
  });

  // Build orgId → best plan map. When an org somehow has two active subs
  // (e.g. mid-upgrade), keep the higher-tier one.
  const planByOrg = new Map<string, string>();
  for (const sub of activeSubs) {
    const current = planByOrg.get(sub.referenceId);
    const currentPriority = current !== undefined ? (PLAN_PRIORITY[current] ?? 99) : 99;
    const newPriority = PLAN_PRIORITY[sub.plan] ?? 99;
    if (newPriority < currentPriority) {
      planByOrg.set(sub.referenceId, sub.plan);
    }
  }

  const result = orgs.map((org) => {
    const plan = planByOrg.get(org.id) ?? "free";
    const retentionDays = PLAN_RETENTION_DAYS[plan] ?? 7;
    return { orgId: org.id, plan, retentionDays };
  });

  return NextResponse.json({ orgs: result });
}
