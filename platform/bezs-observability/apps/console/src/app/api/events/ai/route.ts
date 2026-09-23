// GET /api/events/ai — paginated AI event query with kind and model filters.
// Mirrors /api/events/logs but fixes event_type = 'ai' and extracts
// AI-specific payload fields (kind, model, tokens, cost, latency) server-side.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { queryAIEvents } from "@/lib/clickhouse";

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

  const events = await queryAIEvents({
    orgId:    sessionOrgId,
    appId:    sp.get("appId")    ?? undefined,
    kind:     sp.get("kind")     ?? undefined,
    model:    sp.get("model")    ?? undefined,
    severity: sp.get("severity") ?? undefined,
    search:   sp.get("search")   ?? undefined,
    from:     sp.get("from")     ?? undefined,
    to:       sp.get("to")       ?? undefined,
    limit:    Number(sp.get("limit")  ?? 50),
    offset:   Number(sp.get("offset") ?? 0),
  });

  return NextResponse.json(events);
}
