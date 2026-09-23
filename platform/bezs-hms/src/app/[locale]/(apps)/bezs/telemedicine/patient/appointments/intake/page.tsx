/**
 * Voice intake page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/intake/voice
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the patient profile page if no FHIR Patient record exists.
 *
 * Renders VoiceIntake directly (no extra wrapper) so the component's own
 * full-height layout fills the viewport.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { VoiceIntakeTest } from "@/modules/client/telemedicine/patient/component/intake/VoiceIntakeTest";

/**
 * Voice-based intake session page (custom WebSocket voice agent).
 */
export default async function VoiceIntakePage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /patient/profile if no FHIR Patient record exists
  const patient = await requirePatientProfile();

  const basePath = `/${locale}/bezs/telemedicine/patient`;

  return (
    <VoiceIntakeTest
      patientFhirId={patient.id}
      basePath={basePath}
      userName={session.user.name ?? "Patient"}
    />
  );
}
