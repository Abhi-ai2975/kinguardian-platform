// GET /api/admin/organisations — list all organisations from the shared database.
// Requires superadmin role.
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { listOrgs } from "@/lib/admin-db";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const orgs = await listOrgs();
    return NextResponse.json({ organisations: orgs, total: orgs.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
