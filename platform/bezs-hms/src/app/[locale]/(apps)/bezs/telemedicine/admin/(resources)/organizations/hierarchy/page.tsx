/**
 * Organization Hierarchy page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin/organizations/hierarchy
 *
 * Client-rendered tree visualization of the Organization partOf hierarchy.
 * The heavy "fetch every organization" work happens client-side inside
 * OrganizationHierarchyView (TanStack Query) — this Server Component only
 * resolves the tenant's org id from the session.
 */

import { OrganizationHierarchyView } from "@/modules/client/telemedicine/admin/components/organizations/OrganizationHierarchyView";
import { OrganizationModalProvider } from "@/modules/client/telemedicine/admin/provider/OrganizationModalProvider";
import { getServerSession } from "@/modules/server/auth/get-session";

/** Telemedicine admin — Organization hierarchy visualization screen. */
export default async function OrganizationHierarchyPage() {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? null;

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Organization Hierarchy</h1>
        <p className="text-sm text-muted-foreground">
          Visualize the parent/child relationships between organizations.
          Click a node to edit it.
        </p>
      </div>

      <OrganizationHierarchyView orgId={orgId} />

      <OrganizationModalProvider />
    </div>
  );
}
