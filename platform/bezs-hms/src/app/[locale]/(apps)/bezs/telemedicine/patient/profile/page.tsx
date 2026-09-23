/**
 * Patient profile setup page.
 *
 * Route: /[locale]/telemedicine/patient/profile
 *
 * Server component. Calls getPatientMeAction (ZSA) to fetch the authenticated
 * user's Patient record. Passes the result — or null on 404 — to
 * PatientProfileForm, which handles both create and edit modes.
 *
 * Profile photo metadata (file ID, item ID) is read directly from
 * patient.photo[] in the FHIR response — no separate DB call needed.
 *
 * Access: authenticatedProcedure (any signed-in user).
 */

import { redirect } from "@/i18n/navigation";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getPatientMeAction } from "@/modules/server/presentation/actions/patient";
import { getLocale } from "next-intl/server";
import { PatientProfileForm } from "@/modules/client/telemedicine/patient/forms/patient-profile-form";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

/**
 * Calls getPatientMeAction and returns the patient or null on 404.
 * Re-throws any unexpected errors so the error boundary handles them.
 *
 * @returns The patient record or null (no record exists yet).
 */
async function fetchPatientOrNull(): Promise<TPatientResponse | null> {
  const [data, err] = await getPatientMeAction();
  if (err) {
    // NOT_FOUND means first-time setup — render the form in create mode.
    if (err.code === "NOT_FOUND") return null;
    throw new Error(err.message ?? "Failed to load patient profile");
  }
  return data ?? null;
}

async function PatientProfilePage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const patient = await fetchPatientOrNull();

  return (
    <PatientProfileForm
      initialPatient={patient}
      userId={session.user.id}
      orgId={session.session.activeOrganizationId ?? ""}
    />
  );
}

export default PatientProfilePage;
