// plan-limits.ts — single source of truth for every plan-gated resource limit.
// All enforcement code imports from here so the numbers are never duplicated.
// Must stay in sync with:
//   apps/console/src/app/(dashboard)/settings/billing/plans/page.tsx  (FEATURES table)
//   apps/console/src/components/marketing/PricingSection.tsx           (plan cards)
"server-only";

import { prisma } from "../../../../prisma/db";

// ── Limit table ───────────────────────────────────────────────────────────────

export const PLAN_LIMITS = {
  free: {
    organizations:  1,
    teams:          1,
    membersPerTeam: 3,
    applications:   2,
    // Secret keys (server-side, wtch_ prefix) and public tokens (browser-side,
    // wpub_ prefix) have independent quotas — a free org gets 2 of each, not
    // 2 shared across both types.
    apiKeys:        2,
    publicTokens:   2,
  },
  pro: {
    organizations:  5,
    teams:          10,
    membersPerTeam: 20,
    applications:   10,
    apiKeys:        20,
    publicTokens:   10,
  },
  enterprise: {
    // Number.MAX_SAFE_INTEGER used instead of Infinity so the value is
    // safe to pass to any numeric comparison inside better-auth.
    organizations:  Number.MAX_SAFE_INTEGER,
    teams:          Number.MAX_SAFE_INTEGER,
    membersPerTeam: Number.MAX_SAFE_INTEGER,
    applications:   Number.MAX_SAFE_INTEGER,
    apiKeys:        Number.MAX_SAFE_INTEGER,
    publicTokens:   Number.MAX_SAFE_INTEGER,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

// Lower number = higher tier (used when an entity has multiple active subs).
const PLAN_PRIORITY: Record<string, number> = { enterprise: 1, pro: 2, free: 3 };

function normalizePlan(plan: string | null | undefined): Plan {
  if (plan === "enterprise" || plan === "pro") return plan;
  return "free";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Returns the highest-tier active subscription plan for a given organisation.
// Falls back to "free" when the org has no active subscription.
export async function getOrgPlan(orgId: string): Promise<Plan> {
  const subs = await prisma.subscription.findMany({
    where: { referenceId: orgId, status: { in: ["active", "trialing"] } },
    select: { plan: true },
  });

  let best: Plan = "free";
  for (const sub of subs) {
    const candidate = normalizePlan(sub.plan);
    if (PLAN_PRIORITY[candidate] < PLAN_PRIORITY[best]) best = candidate;
  }
  return best;
}

// Returns the highest-tier plan across all organisations a user is a member of.
// Used by organizationLimit — a user who has upgraded one of their orgs to Pro
// is allowed to create up to the Pro org quota.
export async function getBestPlanForUser(userId: string): Promise<Plan> {
  const memberships = await prisma.member.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  if (memberships.length === 0) return "free";

  const subs = await prisma.subscription.findMany({
    where: {
      referenceId: { in: memberships.map((m) => m.organizationId) },
      status: { in: ["active", "trialing"] },
    },
    select: { plan: true },
  });

  let best: Plan = "free";
  for (const sub of subs) {
    const candidate = normalizePlan(sub.plan);
    if (PLAN_PRIORITY[candidate] < PLAN_PRIORITY[best]) best = candidate;
  }
  return best;
}

// ── Error messages ────────────────────────────────────────────────────────────

export function limitMessage(resource: string, limit: number): string {
  return `Your plan allows up to ${limit} ${resource}. Upgrade your plan to create more.`;
}
