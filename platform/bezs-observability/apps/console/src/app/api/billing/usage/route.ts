// GET /api/billing/usage — returns current-month event count for the active org.
// The plan limit comes from the query param supplied by the client (who already
// has subscription data from IAM) so this route stays ClickHouse-only.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { getMonthlyEventCount } from "@/lib/clickhouse";

const PLAN_LIMITS: Record<string, number> = {
  free: 100_000,
  pro: 5_000_000,
  enterprise: -1,
};

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.session.activeOrganizationId ?? "";
  const plan = req.nextUrl.searchParams.get("plan") ?? "free";

  const count = await getMonthlyEventCount(orgId);
  const limit = PLAN_LIMITS[plan] ?? 100_000;

  return NextResponse.json({
    count,
    limit,
    plan,
    percentage: limit === -1 ? 0 : Math.min(100, Math.round((count / limit) * 100)),
  });
}
