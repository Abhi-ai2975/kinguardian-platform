/**
 * Doctor portal dashboard page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record exists
 *     (via requirePractitionerProfile).
 *
 * Data flow:
 *  SSR → listAppointmentsAction(practitioner_id, today's date range)
 *      → DoctorDashboard (two-panel: appointment list + lazy-loaded detail cards)
 *
 * Today's appointments are filtered server-side using start_from / start_to so
 * only same-day appointments are passed to the client component.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { DoctorDashboard } from "@/modules/client/telemedicine/doctor/component/dashboard/DoctorDashboard";
import type {
  TAppointmentResponse,
  TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

/** Maximum appointments to fetch for the dashboard (covers any realistic single-day schedule). */
const DASHBOARD_LIMIT = 50;

/**
 * Derives the practitioner's display name from the FHIR Practitioner resource.
 * Prefers the text field of the first name entry, then constructs from given + family.
 *
 * @param name - Array of HumanName objects from TPractitionerResponse.name.
 * @returns Display name string, or "Doctor" as fallback.
 */
function getPractitionerDisplayName(
  name?: Array<{
    text?: string | null;
    family?: string | null;
    given?: string[] | null;
  }> | null,
): string {
  if (!name || name.length === 0) return "Doctor";
  const first = name[0];
  if (first.text) return first.text;
  const parts = [...(first.given ?? []), first.family ?? ""].filter(Boolean);
  return parts.join(" ") || "Doctor";
}

/**
 * Doctor dashboard page.
 * Fetches today's appointments for the authenticated practitioner and renders
 * the two-panel DoctorDashboard.
 */
export default async function DoctorPage() {
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

  // Redirects to /doctor/settings/profile if no FHIR Practitioner record
  const practitioner = await requirePractitionerProfile();

  // Build today's date range in ISO 8601 (local midnight → 23:59:59.999)
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [data] = await listAppointmentsAction({
    payload: {
      practitioner_id: practitioner.id,
      start_from: startOfDay.toISOString(),
      start_to: endOfDay.toISOString(),
      limit: DASHBOARD_LIMIT,
      offset: 0,
    },
  });

  const appointments: TAppointmentResponse[] =
    (data as TPaginatedAppointmentResponse | null)?.data ?? [];

  // Sort by start time ascending so the list reads chronologically
  appointments.sort((a, b) => {
    const aT = a.start ? new Date(a.start).getTime() : 0;
    const bT = b.start ? new Date(b.start).getTime() : 0;
    return aT - bT;
  });

  const doctorName = getPractitionerDisplayName(practitioner.name);

  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <DoctorDashboard
      appointments={appointments}
      doctorName={doctorName}
      todayLabel={todayLabel}
    />
  );
}
