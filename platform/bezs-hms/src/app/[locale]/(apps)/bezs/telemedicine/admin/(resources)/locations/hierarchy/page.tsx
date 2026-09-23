/**
 * Location Hierarchy page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin/locations/hierarchy
 *
 * Client-rendered tree visualization of the Location part_of hierarchy.
 * The heavy "fetch every location" work happens client-side inside
 * LocationHierarchyView (TanStack Query) — this Server Component only
 * resolves the tenant's org id from the session.
 */

import { LocationHierarchyView } from "@/modules/client/telemedicine/admin/components/locations/LocationHierarchyView";
import { LocationModalProvider } from "@/modules/client/telemedicine/admin/provider/LocationModalProvider";
import { getServerSession } from "@/modules/server/auth/get-session";

/** Telemedicine admin — Location hierarchy visualization screen. */
export default async function LocationHierarchyPage() {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? null;

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Location Hierarchy</h1>
        <p className="text-sm text-muted-foreground">
          Visualize the parent/child relationships between locations. Click a
          node to edit it.
        </p>
      </div>

      <LocationHierarchyView orgId={orgId} />

      <LocationModalProvider />
    </div>
  );
}
