/**
 * Patient AI consultation selector page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/consultation
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the patient profile page if no FHIR Patient record exists
 *     (via requirePatientProfile).
 *
 * Renders the ConsultationSelector card picker (Text vs Voice).
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { ConsultationSelector } from "@/modules/client/telemedicine/patient/component/consultation/ConsultationSelector";

/**
 * AI consultation entry page — renders the mode selector.
 */
export default async function ConsultationPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /patient/profile if no FHIR Patient record exists
  await requirePatientProfile();

  return <ConsultationSelector />;
}
