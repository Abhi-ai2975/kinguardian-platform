/**
 * DashboardPage — org-level overview with charts and recent activity.
 *
 * Server component: fetches the full dashboard payload in a single backend
 * call and passes pre-shaped data to each client chart component. No client-
 * side data fetching — all data is server-rendered on first load.
 *
 * Layout:
 *   Row 1 — four stat cards (total files, storage, uploads/30d, active projects)
 *   Row 2 — uploads bar chart + storage area chart (side by side)
 *   Row 3 — status donut + recent files list (side by side)
 *
 * @module
 */
import { getServerSession } from "@/modules/server/auth/get-session";
import { getDashboardAction } from "@/modules/server/presentation/actions/dashboard.actions";
import { StatCards } from "@/modules/client/dashboard/components/StatCards";
import { UploadsChart } from "@/modules/client/dashboard/components/UploadsChart";
import { StorageChart } from "@/modules/client/dashboard/components/StorageChart";
import { StatusDonut } from "@/modules/client/dashboard/components/StatusDonut";
import { RecentFilesList } from "@/modules/client/dashboard/components/RecentFilesList";
import type { TDashboardResponse } from "@/modules/entities/schemas/dashboard";

const EMPTY_DASHBOARD: TDashboardResponse = {
  stats: {
    total_files: 0,
    total_storage_bytes: 0,
    files_uploaded_30d: 0,
    active_projects: 0,
  },
  uploads_by_day: [],
  storage_by_day: [],
  status_distribution: [],
  recent_files: [],
};

export default async function DashboardPage() {
  const session = await getServerSession();
  const [data] = await getDashboardAction({ payload: {} });
  const dashboard = data ?? EMPTY_DASHBOARD;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, {session?.user.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here&apos;s what&apos;s happening in your organisation.
        </p>
      </div>

      {/* Row 1 — stat cards */}
      <StatCards stats={dashboard.stats} />

      {/* Row 2 — time-series charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <UploadsChart data={dashboard.uploads_by_day} />
        <StorageChart data={dashboard.storage_by_day} />
      </div>

      {/* Row 3 — status donut + recent files */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <StatusDonut data={dashboard.status_distribution} />
        <RecentFilesList files={dashboard.recent_files} />
      </div>
    </div>
  );
}
