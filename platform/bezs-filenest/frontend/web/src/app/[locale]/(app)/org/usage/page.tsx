/**
 * UsagePage — org-level usage meters with a per-project storage breakdown.
 *
 * Server component: fetches the usage payload in a single backend call and
 * passes pre-shaped data to the client components. No client-side fetching.
 *
 * Layout:
 *   Row 1 — four headline stat cards (storage, files, uploads/30d, projects)
 *   Row 2 — per-project sortable breakdown table with Progress bars
 *
 * @module
 */
import { getUsageAction } from "@/modules/server/presentation/actions/usage.actions";
import { UsageMeters } from "@/modules/client/usage/components/UsageMeters";
import { ProjectUsageTable } from "@/modules/client/usage/components/ProjectUsageTable";
import type { TUsageResponse } from "@/modules/entities/schemas/usage";

const EMPTY_USAGE: TUsageResponse = {
  stats: {
    total_files: 0,
    total_storage_bytes: 0,
    active_projects: 0,
    files_uploaded_30d: 0,
  },
  projects: [],
};

export default async function UsagePage() {
  const [data] = await getUsageAction({ payload: {} });
  const usage = data ?? EMPTY_USAGE;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Usage</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Storage and file counts across all projects in this organisation.
        </p>
      </div>

      <UsageMeters stats={usage.stats} />

      <div>
        <h3 className="text-sm font-medium mb-3">Per-project breakdown</h3>
        <ProjectUsageTable
          projects={usage.projects}
          totalStorageBytes={usage.stats.total_storage_bytes}
        />
      </div>
    </div>
  );
}
