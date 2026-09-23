// GET /api/admin/stats — platform-wide stats for the admin overview page.
// Combines ClickHouse event counts with PostgreSQL user and org counts.
// Requires superadmin role — validated via the session forwarded to IAM.
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { getPlatformCounts, getRecentOrgs } from "@/lib/admin-db";
import { listUsers } from "@/lib/iam-admin";
import { clickhouse } from "@/lib/clickhouse";

async function queryPlatformEvents() {
  try {
    const result = await clickhouse.query({
      query: `
        SELECT
          count()                                    AS total_today,
          countIf(severity IN ('error','critical'))  AS errors_today
        FROM watcher.events
        WHERE timestamp >= toStartOfDay(now())
      `,
      format: "JSONEachRow",
    });
    const rows = await result.json<{ total_today: number; errors_today: number }>();
    return rows[0] ?? { total_today: 0, errors_today: 0 };
  } catch {
    return { total_today: 0, errors_today: 0 };
  }
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [counts, eventStats, recentOrgs, usersResult] = await Promise.allSettled([
    getPlatformCounts(),
    queryPlatformEvents(),
    getRecentOrgs(5),
    listUsers({ limit: 5, sortBy: "createdAt", sortDirection: "desc" }),
  ]);

  return NextResponse.json({
    userCount: counts.status === "fulfilled" ? counts.value.userCount : 0,
    orgCount: counts.status === "fulfilled" ? counts.value.orgCount : 0,
    eventsToday: eventStats.status === "fulfilled" ? eventStats.value.total_today : 0,
    errorsToday: eventStats.status === "fulfilled" ? eventStats.value.errors_today : 0,
    recentOrgs: recentOrgs.status === "fulfilled" ? recentOrgs.value : [],
    recentUsers: usersResult.status === "fulfilled" ? usersResult.value.users : [],
  });
}
