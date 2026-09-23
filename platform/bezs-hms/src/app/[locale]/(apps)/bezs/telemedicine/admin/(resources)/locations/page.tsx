/**
 * Locations page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin/locations
 *
 * Server component: fetches the first page of locations at render time to
 * hydrate the table without a client-side loading flash. Subsequent
 * pagination and filter changes are handled client-side via server actions.
 */

import { LocationsTable } from "@/modules/client/telemedicine/admin/components/locations/LocationsTable";
import { LocationModalProvider } from "@/modules/client/telemedicine/admin/provider/LocationModalProvider";
import { getServerSession } from "@/modules/server/auth/get-session";
import { listLocationsAction } from "@/modules/server/presentation/actions/location";

/**
 * Telemedicine admin — Locations management screen.
 * Lists all FHIR locations with full CRUD capabilities.
 */
export default async function LocationsPage() {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? null;
  const userId = session?.user.id ?? null;

  const [data] = await listLocationsAction({
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
        <h1 className="text-2xl font-semibold">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Manage FHIR locations — buildings, wings, wards, and rooms.
        </p>
      </div>

      <LocationsTable initialData={initialData} orgId={orgId} userId={userId} />

      <LocationModalProvider />
    </div>
  );
}
