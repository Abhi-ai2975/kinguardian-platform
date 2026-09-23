import { listUserContextsAction } from "@/modules/server/presentation/actions/admin/user-context.action";
import { requireRole } from "@/modules/server/shared/auth/require-role";
import UserContextTable from "@/modules/client/admin/components/user-context/UserContextTable";

async function UserContextPage() {
  await requireRole(["superadmin"]);

  const [items, error] = await listUserContextsAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">User Context</h1>
        <p className="text-sm text-muted-foreground">
          Manage each user&apos;s active organization and role context.
        </p>
      </div>
      <UserContextTable items={items ?? null} error={error ?? null} />
    </div>
  );
}

export default UserContextPage;
