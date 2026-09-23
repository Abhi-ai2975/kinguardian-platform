/**
 * Patient voice AI consultation page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/consultation/voice
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the patient profile page if no FHIR Patient record exists
 *     (via requirePatientProfile).
 *
 * Renders VoiceConsultationTest — WebSocket voice agent backed by
 * CONSULTATION_VOICE_AGENT_URL.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { VoiceConsultationTest } from "@/modules/client/telemedicine/patient/component/consultation/VoiceConsultationTest";

/**
 * Voice consultation page (custom WebSocket voice agent).
 */
export default async function ConsultationVoicePage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const patient = await requirePatientProfile();

  const basePath = `/${locale}/bezs/telemedicine/patient`;

  return (
    <VoiceConsultationTest
      patientFhirId={patient.id}
      basePath={basePath}
      userName={session.user.name ?? "Patient"}
    />
  );
}
