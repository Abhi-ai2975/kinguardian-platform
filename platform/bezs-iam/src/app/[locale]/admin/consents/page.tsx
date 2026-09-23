import ConsentsTable from "@/modules/client/admin/components/consents/ConsentsTable";
import { listConsentsAction } from "@/modules/server/presentation/actions/admin";
import { requireRole } from "@/modules/server/shared/auth/require-role";

async function ConsentsPage() {
  await requireRole(["superadmin"]);

  const [consents, error] = await listConsentsAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">OAuth Consents</h1>
        <p className="text-sm text-muted-foreground">
          View and manage OAuth consents granted by users to registered clients.
        </p>
      </div>
      <ConsentsTable consents={consents ?? null} error={error ?? null} />
    </div>
  );
}

export default ConsentsPage;
