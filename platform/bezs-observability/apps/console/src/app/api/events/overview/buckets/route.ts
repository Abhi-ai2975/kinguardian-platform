// GET /api/events/overview/buckets?orgId=&from=&to=
// Returns time-bucketed event counts for the trend chart widget.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { queryHourlyBuckets } from "@/lib/clickhouse";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const orgId = session.session.activeOrganizationId ?? "";

  const buckets = await queryHourlyBuckets(orgId, {
    from: sp.get("from") ?? undefined,
    to:   sp.get("to")   ?? undefined,
  });

  return NextResponse.json(buckets);
}
