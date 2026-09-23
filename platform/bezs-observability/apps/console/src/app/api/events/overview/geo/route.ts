// GET /api/events/overview/geo?orgId=&from=&to=
// Returns per-country event counts for the global map widget.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { queryGeoDistribution } from "@/lib/clickhouse";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const orgId = session.session.activeOrganizationId ?? "";

  const geo = await queryGeoDistribution(orgId, {
    from: sp.get("from") ?? undefined,
    to:   sp.get("to")   ?? undefined,
  });

  return NextResponse.json(geo);
}
