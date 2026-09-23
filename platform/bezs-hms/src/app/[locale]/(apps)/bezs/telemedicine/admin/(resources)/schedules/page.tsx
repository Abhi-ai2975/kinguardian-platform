/**
 * Schedules page — telemedicine admin section.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/admin/schedules
 *
 * Server component: fetches the first page of schedules at render time to
 * hydrate the table without a client-side loading flash. Subsequent
 * pagination and filter changes are handled client-side via server actions.
 *
 * Unlike Location/HealthcareService, fhir-gql's ListSchedulesSchema has no
 * org_id filter — the initial fetch below is NOT tenant-scoped server-side.
 */

import { SchedulesTable } from "@/modules/client/telemedicine/admin/components/schedules/SchedulesTable";
import { ScheduleModalProvider } from "@/modules/client/telemedicine/admin/provider/ScheduleModalProvider";
import { getServerSession } from "@/modules/server/auth/get-session";
import { listSchedulesAction } from "@/modules/server/presentation/actions/schedule";

/**
 * Telemedicine admin — Schedules management screen.
 * Lists all FHIR schedules with full CRUD capabilities.
 */
export default async function SchedulesPage() {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? null;
  const userId = session?.user.id ?? null;

  const [data] = await listSchedulesAction({
    payload: {
      limit: 20,
      offset: 0,
    },
  });

  const initialData = data ?? { total: 0, limit: 20, offset: 0, data: [] };

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Schedules</h1>
        <p className="text-sm text-muted-foreground">
          Manage FHIR schedules — availability windows for practitioner
          roles, locations, and healthcare services.
        </p>
      </div>

      <SchedulesTable initialData={initialData} orgId={orgId} userId={userId} />

      <ScheduleModalProvider />
    </div>
  );
}
