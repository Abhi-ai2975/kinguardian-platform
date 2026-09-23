import { listOrganizationsAction } from "@/modules/server/presentation/actions/admin/organizations.action";
import { requireRole } from "@/modules/server/shared/auth/require-role";
import OrganizationsTable from "@/modules/client/admin/components/organizations/OrganizationsTable";

async function OrganizationsPage() {
  await requireRole(["superadmin"]);

  const [organizations, error] = await listOrganizationsAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <p className="text-sm text-muted-foreground">
          Manage all organizations, their members, invitations, and teams.
        </p>
      </div>
      <OrganizationsTable organizations={organizations ?? null} error={error ?? null} />
    </div>
  );
}

export default OrganizationsPage;
