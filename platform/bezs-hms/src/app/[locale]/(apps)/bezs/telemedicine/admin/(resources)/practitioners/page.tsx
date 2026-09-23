/**
 * Practitioners page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin/practitioners
 *
 * Server component: fetches the first page of practitioners at render time
 * to hydrate the table without a client-side loading flash. Subsequent
 * pagination and filter changes are handled client-side via server actions.
 */

import { PractitionersTable } from "@/modules/client/telemedicine/admin/components/practitioners/PractitionersTable";
import { PractitionerModalProvider } from "@/modules/client/telemedicine/admin/provider/PractitionerModalProvider";
import { getServerSession } from "@/modules/server/auth/get-session";
import { listPractitionersAction } from "@/modules/server/presentation/actions/practitioner";

/**
 * Telemedicine admin — Practitioners management screen.
 * Lists all FHIR practitioners with full CRUD capabilities.
 */
export default async function PractitionersPage() {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? null;
  const userId = session?.user.id ?? null;

  const [data] = await listPractitionersAction({
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
        <h1 className="text-2xl font-semibold">Practitioners</h1>
        <p className="text-sm text-muted-foreground">
          Manage FHIR practitioners — the people who deliver care, and the
          user accounts their profiles are linked to.
        </p>
      </div>

      <PractitionersTable initialData={initialData} orgId={orgId} userId={userId} />

      <PractitionerModalProvider />
    </div>
  );
}
