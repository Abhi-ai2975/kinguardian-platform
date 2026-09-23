/**
 * Slots page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin/slots
 *
 * Server component: fetches the first page of slots at render time to
 * hydrate the table without a client-side loading flash. Subsequent
 * pagination and filter changes are handled client-side via server actions.
 *
 * Unlike Schedule, fhir-gql's ListSlotsSchema has a real org_id filter — the
 * initial fetch below IS tenant-scoped server-side.
 */

import { SlotsTable } from "@/modules/client/telemedicine/admin/components/slots/SlotsTable";
import { SlotModalProvider } from "@/modules/client/telemedicine/admin/provider/SlotModalProvider";
import { getServerSession } from "@/modules/server/auth/get-session";
import { listSlotsAction } from "@/modules/server/presentation/actions/slot";

/**
 * Telemedicine admin — Slots management screen.
 * Lists all FHIR slots with full CRUD plus bulk-generation capabilities.
 */
export default async function SlotsPage() {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? null;
  const userId = session?.user.id ?? null;

  const [data] = await listSlotsAction({
    payload: {
      limit: 10,
      offset: 0,
      org_id: orgId ?? undefined,
    },
  });

  const initialData = data ?? { total: 0, limit: 10, offset: 0, data: [] };

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Slots</h1>
        <p className="text-sm text-muted-foreground">
          Manage FHIR slots — bookable time windows on a schedule. Generate
          slots in bulk across a time window, or create one-off slots manually.
        </p>
      </div>

      <SlotsTable initialData={initialData} orgId={orgId} userId={userId} />

      <SlotModalProvider />
    </div>
  );
}
