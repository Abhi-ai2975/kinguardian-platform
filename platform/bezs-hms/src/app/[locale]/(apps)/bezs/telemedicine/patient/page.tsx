/**
 * Patient portal dashboard page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session is found.
 *  2. Redirects to /patient/settings/profile if no FHIR Patient record exists
 *     (via requirePatientProfile).
 *
 * Data flow:
 *  SSR → getMyAppointmentsAction({ limit: 200 }) → PatientDashboard (derives stats client-side)
 *
 * A limit of 200 ensures the stat cards and charts are accurate across the
 * patient's full history without requiring a separate aggregation endpoint.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { getMyAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { PatientDashboard } from "@/modules/client/telemedicine/patient/component/dashboard/PatientDashboard";
import type {
  TAppointmentResponse,
  TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

/** Max records to fetch for dashboard stats — keeps the response bounded. */
const DASHBOARD_LIMIT = 200;

/**
 * Patient portal home page.
 * Fetches appointments for the authenticated patient and renders the dashboard.
 */
export default async function PatientPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  console.log({
    orgId: session.session.activeOrganizationId,
    userId: session.user.id,
  });

  /* Enforce that the user has completed their patient FHIR profile setup. */
  await requirePatientProfile();

  /* Fetch the patient's full appointment history for stats (max 200). */
  const [data] = await getMyAppointmentsAction({
    payload: { limit: DASHBOARD_LIMIT, offset: 0 },
  });

  const appointments: TAppointmentResponse[] =
    (data as TPaginatedAppointmentResponse | null)?.data ?? [];

  return (
    <PatientDashboard
      userName={session.user.name}
      appointments={appointments}
    />
  );
}
