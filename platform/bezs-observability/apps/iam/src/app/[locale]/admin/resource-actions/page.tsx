import ResourceActionsTable from "@/modules/client/admin/components/resources/ResourceActionsTable";
import { listResourceActionsAction } from "@/modules/server/presentation/actions/admin";
import { requireRole } from "@/modules/server/shared/auth/require-role";

async function ResourceActionsPage() {
  await requireRole(["superadmin"]);

  const [actions, error] = await listResourceActionsAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Resource Actions</h1>
        <p className="text-sm text-muted-foreground">
          Manage resource actions (permission keys) used for access control.
        </p>
      </div>
      <ResourceActionsTable actions={actions ?? null} error={error ?? null} />
    </div>
  );
}

export default ResourceActionsPage;
