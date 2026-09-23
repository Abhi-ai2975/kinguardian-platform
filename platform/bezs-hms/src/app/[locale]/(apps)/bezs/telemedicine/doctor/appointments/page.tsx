/**
 * Doctor appointments list page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/appointments
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to the doctor profile setup page if no FHIR Practitioner record
 *     exists (via requirePractitionerProfile).
 *
 * Data flow:
 *  SSR → listAppointmentsAction(org_id, practitioner_id, page 0)
 *      → DoctorAppointmentsTable (initialData, practitionerId props)
 *  Client → useQuery → fetchDoctorAppointments → re-renders on page change
 */

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";
import { DoctorAppointmentsTable } from "@/modules/client/telemedicine/doctor/component/appointments/list/DoctorAppointmentsTable";
import { DoctorModalProvider } from "@/modules/client/telemedicine/doctor/provider/DoctorModalProvider";

/** Page-level page size — must match INITIAL_PAGE_SIZE in the table component. */
const INITIAL_PAGE_SIZE = 10;

/**
 * Doctor appointments list page.
 *
 * Scopes the list to the specific practitioner via practitioner_id, so the
 * doctor only sees their own appointments (not the whole org).
 */
export default async function DoctorAppointmentsPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /doctor/settings/profile if no FHIR Practitioner record exists
  const practitioner = await requirePractitionerProfile();

  const orgId = session.session.activeOrganizationId ?? null;
  const practitionerId = practitioner.id;
  const base = `/${locale}/bezs/telemedicine/doctor`;

  // Pre-fetch page 0 scoped to this practitioner
  const [data] = await listAppointmentsAction({
    payload: {
      limit: INITIAL_PAGE_SIZE,
      offset: 0,
      org_id: orgId ?? undefined,
      practitioner_id: practitionerId,
    },
  });

  /** Safe empty fallback if the action fails at render time. */
  const initialData = data ?? {
    total: 0,
    limit: INITIAL_PAGE_SIZE,
    offset: 0,
    data: [],
  };

  return (
    <div className="space-y-6 w-full">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Manage patient appointments for your practice.
          </p>
        </div>

        {/*
         * In-app entry point to Clinical Records. The doctor sidebar comes from
         * the Bezs menu service rather than this repo, so this link is what
         * makes the section reachable until a menu entry is added there.
         */}
        <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
          <Link href={`${base}/clinical-records`}>
            <ClipboardList className="size-4" />
            Clinical Records
          </Link>
        </Button>
      </div>

      {/* ── Appointments table ── */}
      <DoctorAppointmentsTable
        initialData={initialData}
        orgId={orgId}
        practitionerId={practitionerId}
        viewHref={`${base}/appointments`}
      />

      {/* Modal singletons — controlled by doctor Zustand store */}
      <DoctorModalProvider />
    </div>
  );
}
