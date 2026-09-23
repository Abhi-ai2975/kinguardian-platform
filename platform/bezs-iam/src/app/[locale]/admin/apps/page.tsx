import AppsTable from "@/modules/client/admin/components/apps/AppsTable";
import { listAppsAction } from "@/modules/server/presentation/actions/admin";
import { requireRole } from "@/modules/server/shared/auth/require-role";

async function AppsPage() {
  await requireRole(["superadmin"]);

  const [apps, error] = await listAppsAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Apps</h1>
        <p className="text-sm">
          Manage applications and their navigation menus.
        </p>
      </div>
      <AppsTable apps={apps ?? null} error={error ?? null} />
    </div>
  );
}

export default AppsPage;
