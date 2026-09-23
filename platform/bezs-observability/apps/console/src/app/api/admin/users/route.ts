// GET /api/admin/users — list all platform users, proxied from IAM's admin API.
// Requires superadmin role.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { listUsers } from "@/lib/iam-admin";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  try {
    const data = await listUsers({
      limit: Number(sp.get("limit") ?? 200),
      offset: Number(sp.get("offset") ?? 0),
      searchValue: sp.get("search") ?? undefined,
      sortBy: sp.get("sortBy") ?? "createdAt",
      sortDirection: (sp.get("sortDirection") as "asc" | "desc") ?? "desc",
    });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
