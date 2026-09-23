import { getUsersAction } from "@/modules/server/presentation/actions/admin/users.action";
import { requireRole } from "@/modules/server/shared/auth/require-role";
import UsersTable from "@/modules/client/admin/components/users/UsersTable";

async function UsersPage() {
  await requireRole(["superadmin"]);

  const [users, error] = await getUsersAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm">
          Manage user identities, roles, and access across organizations.
        </p>
      </div>
      <UsersTable users={users ?? null} error={error ?? null} />
    </div>
  );
}

export default UsersPage;
