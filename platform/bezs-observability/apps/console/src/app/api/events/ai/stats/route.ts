// GET /api/events/ai/stats — AI analytics aggregations for dashboard widgets.
// The `metric` query param selects which aggregation to run:
//   tokens-over-time  → hourly token usage grouped by model
//   cost-by-model     → total cost per model
//   latency-by-model  → p50/p95/p99 latency per model
//   workflow-cost     → top workflows by total cost
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { queryAIStats } from "@/lib/clickhouse";

const VALID_METRICS = ["tokens-over-time", "cost-by-model", "latency-by-model", "workflow-cost"] as const;
type Metric = typeof VALID_METRICS[number];

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.session.activeOrganizationId ?? "";
  const sp    = req.nextUrl.searchParams;
  const metric = sp.get("metric") as Metric | null;

  if (!metric || !VALID_METRICS.includes(metric)) {
    return NextResponse.json(
      { error: `metric must be one of: ${VALID_METRICS.join(", ")}` },
      { status: 400 },
    );
  }

  const data = await queryAIStats(orgId, metric, {
    from: sp.get("from") ?? undefined,
    to:   sp.get("to")   ?? undefined,
  });

  return NextResponse.json(data);
}
