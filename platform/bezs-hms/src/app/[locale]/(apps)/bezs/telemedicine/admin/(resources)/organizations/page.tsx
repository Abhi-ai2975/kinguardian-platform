/**
 * Organizations page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin/organizations
 *
 * Server component: fetches the first page of organizations at render time
 * to hydrate the table without a client-side loading flash. Subsequent
 * pagination and filter changes are handled client-side via server actions.
 */

import { OrganizationsTable } from "@/modules/client/telemedicine/admin";
import { OrganizationModalProvider } from "@/modules/client/telemedicine/admin/provider/OrganizationModalProvider";
import { getServerSession } from "@/modules/server/auth/get-session";
import { listOrganizationsAction } from "@/modules/server/presentation/actions/organization";

/**
 * Telemedicine admin — Organizations management screen.
 * Lists all FHIR organizations with full CRUD capabilities.
 */
export default async function OrganizationsPage() {
  // Read the session to scope the list to the current tenant's org and stamp new resources.
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? null;
  const userId = session?.user.id ?? null;

  // Pre-fetch the first page so the table renders immediately without a spinner.
  const [data] = await listOrganizationsAction({
    payload: {
      limit: 20,
      offset: 0,
      // Scope to the current tenant — undefined is omitted by the action.
      org_id: orgId ?? undefined,
    },
  });

  // Provide a safe empty fallback if the action fails (e.g. service is down at build time).
  const initialData = data ?? { total: 0, limit: 20, offset: 0, data: [] };

  return (
    <div className="space-y-6 w-full">
      {/* ── Page header ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <p className="text-sm text-muted-foreground">
          Manage FHIR organizations — hospitals, departments, insurers, and
          more.
        </p>
      </div>

      {/* ── Table ── */}
      <OrganizationsTable
        initialData={initialData}
        orgId={orgId}
        userId={userId}
      />

      {/* ── Modal provider — mounts create/edit/delete modals as client-only singletons ── */}
      <OrganizationModalProvider />
    </div>
  );
}
