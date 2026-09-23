import ResourcesTable from "@/modules/client/admin/components/resources/ResourcesTable";
import { listResourcesAction } from "@/modules/server/presentation/actions/admin";
import { requireRole } from "@/modules/server/shared/auth/require-role";

async function ResourcesPage() {
  await requireRole(["superadmin"]);

  const [resources, error] = await listResourcesAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Resources</h1>
        <p className="text-sm text-muted-foreground">
          Manage resources and their permission keys.
        </p>
      </div>
      <ResourcesTable resources={resources ?? null} error={error ?? null} />
    </div>
  );
}

export default ResourcesPage;
