/**
 * PractitionerRoles page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin/practitioner-roles
 *
 * Server component: fetches the first page of practitioner roles at render
 * time to hydrate the table without a client-side loading flash. Subsequent
 * pagination and filter changes are handled client-side via server actions.
 */

import { PractitionerRolesTable } from "@/modules/client/telemedicine/admin/components/practitioner-roles/PractitionerRolesTable";
import { PractitionerRoleModalProvider } from "@/modules/client/telemedicine/admin/provider/PractitionerRoleModalProvider";
import { getServerSession } from "@/modules/server/auth/get-session";
import { listPractitionerRolesAction } from "@/modules/server/presentation/actions/practitioner-role";

/**
 * Telemedicine admin — PractitionerRoles management screen.
 * Lists all FHIR practitioner roles with full CRUD capabilities.
 */
export default async function PractitionerRolesPage() {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? null;
  const userId = session?.user.id ?? null;

  const [data] = await listPractitionerRolesAction({
    payload: {
      limit: 20,
      offset: 0,
      org_id: orgId ?? undefined,
    },
  });

  const initialData = data ?? { total: 0, limit: 20, offset: 0, data: [] };

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Practitioner Roles</h1>
        <p className="text-sm text-muted-foreground">
          Manage FHIR practitioner roles — the association between a
          practitioner, an organization, and where/how they practice.
        </p>
      </div>

      <PractitionerRolesTable initialData={initialData} orgId={orgId} userId={userId} />

      <PractitionerRoleModalProvider />
    </div>
  );
}
