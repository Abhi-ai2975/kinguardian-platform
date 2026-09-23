/**
 * @page admin/users
 * @description Admin page for managing all users in the IAM system.
 *              Requires `superadmin` role.
 *
 * **Data flow:**
 * 1. `requireRole(["superadmin"])` — gates the entire page server-side.
 * 2. `getUsersAction()` — fetches all users via the Clean Architecture layers
 *    (action → controller → use case → service → Better Auth).
 * 3. `<UsersTable>` — renders the users in a TanStack data table with
 *    search, sort, and contextual action dropdowns per row.
 *
 * **States handled:**
 * - Users loaded → full table with row actions
 * - API error → `UsersTable` shows error empty state
 * - Empty list → `UsersTable` shows "No users found" with create CTA
 * @category Page
 */

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
