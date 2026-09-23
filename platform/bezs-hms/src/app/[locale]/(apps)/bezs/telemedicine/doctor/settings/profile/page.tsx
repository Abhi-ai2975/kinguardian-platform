/**
 * Doctor profile setup page.
 *
 * Route: /[locale]/telemedicine/doctor/profile
 *
 * Server component. Calls getMyPractitionerAction (ZSA) to fetch the
 * authenticated user's Practitioner record. Passes the result — or null on
 * 404 — to DoctorProfileForm, which handles both create and edit modes.
 *
 * Access: adminProcedure (telemedicine-admin / doctor role).
 */

import { redirect } from "@/i18n/navigation";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getMyPractitionerAction } from "@/modules/server/presentation/actions/practitioner";
import { getLocale } from "next-intl/server";
import { DoctorProfileForm } from "@/modules/client/telemedicine/doctor/forms/doctor-profile-form";
import type { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Calls getMyPractitionerAction and returns the practitioner or null on 404.
 * Re-throws any unexpected errors so the error boundary handles them.
 *
 * @returns The practitioner record or null (no record exists yet).
 */
async function fetchPractitionerOrNull(): Promise<TPractitionerResponse | null> {
  const [data, err] = await getMyPractitionerAction();
  if (err) {
    // NOT_FOUND means first-time setup — render the form in create mode.
    if (err.code === "NOT_FOUND") return null;
    throw new Error(err.message ?? "Failed to load practitioner profile");
  }
  return data ?? null;
}

async function DoctorProfilePage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const practitioner = await fetchPractitionerOrNull();

  return (
    <DoctorProfileForm
      initialPractitioner={practitioner}
      userId={session.user.id}
      orgId={session.session.activeOrganizationId ?? ""}
    />
  );
}

export default DoctorProfilePage;
