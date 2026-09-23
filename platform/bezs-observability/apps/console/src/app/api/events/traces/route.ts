// GET /api/events/traces — paginated trace event query.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { queryEvents } from "@/lib/clickhouse";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionOrgId = session.session.activeOrganizationId ?? "";

  const sp = req.nextUrl.searchParams;
  if ((sp.get("orgId") ?? "") !== sessionOrgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await queryEvents({
    orgId: sessionOrgId,
    appId: sp.get("appId") ?? undefined,
    eventType: "trace",
    search: sp.get("search") ?? undefined,
    severity: sp.get("severity") ?? undefined,
    source: sp.get("source") ?? undefined,
    serviceName: sp.get("serviceName") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    limit: Number(sp.get("limit") ?? 50),
    offset: Number(sp.get("offset") ?? 0),
  });

  return NextResponse.json(events);
}
