/**
 * Patient Medical Records page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/medical-records
 *
 * Server component. Guards:
 *   1. Redirects to /login if no session.
 *   2. Redirects to /patient/profile if no FHIR Patient record.
 *
 * Data flow:
 *   SSR pre-fetches:
 *     • Fulfilled appointments — patient picks one to start the flow.
 *
 *   After the patient selects an appointment, MedicalRecordsClient:
 *     1. Calls getEncounterByAppointmentAction({ appointment_id }) → resolves encounter
 *     2. In parallel: listServiceRequestsAction({ encounter_id }) + listDiagnosticReportsAction({ encounter_id })
 *     3. Cross-references DRs → shows per-SR upload state
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { getMyAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { MedicalRecordsClient } from "@/modules/client/telemedicine/patient/component/medical-records/MedicalRecordsClient";
import type { TPaginatedAppointmentResponse } from "@/modules/entities/schemas/appointment";

export const dynamic = "force-dynamic";

/**
 * Medical Records server page.
 * Pre-fetches fulfilled appointments only — all FHIR data is loaded
 * on-demand client-side after the patient selects an appointment.
 */
export default async function PatientMedicalRecordsPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  await requirePatientProfile();

  const [appointmentsPage] = await getMyAppointmentsAction({
    payload: { status: "fulfilled", limit: 200, offset: 0 },
  });

  const appointments =
    (appointmentsPage as TPaginatedAppointmentResponse | null)?.data ?? [];

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Medical Records</h1>
        <p className="text-sm text-muted-foreground">
          Select a completed appointment to view and upload your test results.
        </p>
      </div>

      <MedicalRecordsClient appointments={appointments} />
    </div>
  );
}
