/**
 * Healthcare Services page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin/healthcare-services
 *
 * Server component: fetches the first page of healthcare services at render
 * time to hydrate the table without a client-side loading flash. Subsequent
 * pagination and filter changes are handled client-side via server actions.
 */

import { HealthcareServicesTable } from "@/modules/client/telemedicine/admin/components/healthcare-services/HealthcareServicesTable";
import { HealthcareServiceModalProvider } from "@/modules/client/telemedicine/admin/provider/HealthcareServiceModalProvider";
import { getServerSession } from "@/modules/server/auth/get-session";
import { listHealthcareServicesAction } from "@/modules/server/presentation/actions/healthcare-service";

/**
 * Telemedicine admin — Healthcare Services management screen.
 * Lists all FHIR healthcare services with full CRUD capabilities.
 */
export default async function HealthcareServicesPage() {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? null;
  const userId = session?.user.id ?? null;

  const [data] = await listHealthcareServicesAction({
    payload: { limit: 20, offset: 0 },
  });

  const initialData = data ?? { total: 0, limit: 20, offset: 0, data: [] };

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Healthcare Services</h1>
        <p className="text-sm text-muted-foreground">
          Manage FHIR healthcare services — clinical services offered by your organizations.
        </p>
      </div>

      <HealthcareServicesTable initialData={initialData} orgId={orgId} userId={userId} />

      <HealthcareServiceModalProvider />
    </div>
  );
}
