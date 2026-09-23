/**
 * Patient text (chat) AI consultation page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/consultation/chat
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the patient profile page if no FHIR Patient record exists
 *     (via requirePatientProfile).
 *
 * Renders TextConsultation — the streaming chat interface backed by the
 * consultation agent and AiConsultation Prisma model.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { TextConsultation } from "@/modules/client/telemedicine/patient/component/consultation/TextConsultation";

/**
 * Text consultation page — passes session + FHIR profile data to the client component.
 */
export default async function ConsultationChatPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /patient/profile if no FHIR Patient record exists.
  // Returns the FHIR Patient resource so we can pass patient_fhir_id.
  const patient = await requirePatientProfile();

  const basePath = `/${locale}/bezs/telemedicine/patient`;

  return (
    <TextConsultation
      patientFhirId={patient.id}
      orgId={session.session.activeOrganizationId}
      basePath={basePath}
      userName={session.user.name ?? "Patient"}
    />
  );
}
