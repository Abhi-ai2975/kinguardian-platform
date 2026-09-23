/**
 * Doctor EMR page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/emr
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record
 *     (via requirePractitionerProfile).
 *
 * Renders the shared EMRChatContainer with the doctor's base path so that
 * session sidebar navigation routes to /doctor/emr/[sessionId].
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import EMRChatContainer from "@/modules/client/emr-chat/components/EMRChatContainer";

/**
 * DoctorEMRPage — server entry point for the doctor EMR workspace.
 *
 * Auth-guards the route, then renders the full EMRChatContainer with session
 * persistence and history sidebar, scoped to the doctor portal base path.
 */
export default async function DoctorEMRPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Ensures the doctor has a FHIR Practitioner record; redirects if missing.
  await requirePractitionerProfile();

  const userId = session.user.id;
  const orgId = session.session.activeOrganizationId ?? null;

  return (
    <EMRChatContainer
      userId={userId}
      orgId={orgId}
      basePath="/bezs/telemedicine/doctor/emr"
    />
  );
}
