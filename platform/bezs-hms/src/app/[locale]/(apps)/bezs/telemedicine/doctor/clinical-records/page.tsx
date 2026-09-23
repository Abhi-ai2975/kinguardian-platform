/**
 * Clinical Records — patient list page (step 1 of 3).
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/clinical-records
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record exists.
 *
 * Data flow:
 *  SSR → fetchAllDoctorAppointments(practitioner_id, org_id)
 *      → derivePatientSummaries → PatientListTable
 *
 * There is no patients-by-practitioner endpoint on fhir-gql, so the roster is
 * derived by grouping the doctor's own appointments on the Patient participant.
 * See doctorPatients.ts for the 200-per-page walk and its ceiling.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import {
  derivePatientSummaries,
  fetchAllDoctorAppointments,
} from "@/modules/server/presentation/helpers/doctorPatients";
import { PatientListTable } from "@/modules/client/telemedicine/doctor/component/clinical-records/PatientListTable";

/**
 * Clinical Records patient list.
 * Lists every patient this doctor has had an appointment with as the entry
 * point into per-appointment clinical record management.
 */
export default async function ClinicalRecordsPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /doctor/settings/profile if no FHIR Practitioner record exists
  const practitioner = await requirePractitionerProfile();

  const orgId = session.session.activeOrganizationId ?? null;
  const baseHref = `/${locale}/bezs/telemedicine/doctor/clinical-records`;

  const appointments = await fetchAllDoctorAppointments({
    practitionerId: practitioner.id,
    orgId,
  });
  const patients = derivePatientSummaries(appointments);

  return (
    <div className="space-y-6 w-full">
      {/* ── Page header ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Clinical Records</h1>
        <p className="text-sm text-muted-foreground">
          Select a patient to review their appointments and manage clinical
          records, prescriptions, orders and documents.
        </p>
      </div>

      {/* ── Patient roster ── */}
      <PatientListTable patients={patients} baseHref={baseHref} />
    </div>
  );
}
