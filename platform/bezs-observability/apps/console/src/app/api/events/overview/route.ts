// GET /api/events/overview?from=&to=
// Returns aggregate stats for the authenticated org, scoped to the given time range.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { queryOverviewStats } from "@/lib/clickhouse";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const orgId = session.session.activeOrganizationId ?? "";

  const stats = await queryOverviewStats(orgId, {
    from: sp.get("from") ?? undefined,
    to:   sp.get("to")   ?? undefined,
  });

  return NextResponse.json(stats);
}
