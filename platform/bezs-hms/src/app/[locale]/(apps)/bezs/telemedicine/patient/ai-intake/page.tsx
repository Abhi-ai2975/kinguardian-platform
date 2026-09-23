/**
 * AI Intake list page — patient portal.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/ai-intake
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /patient/profile if no FHIR Patient record exists.
 *
 * Data flow:
 *  SSR → listIntakesAction(user_id, page 0)
 *      → IntakesTable (initialData, userId props)
 *  Client → useQuery → fetchPatientIntakes → re-renders on page/filter change
 *
 * Shows all AI Intake sessions the patient has started (TEXT or VOICE),
 * scoped to their Better Auth userId. Each row links to the associated
 * appointment detail page when a FHIR appointment was booked from the intake.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { listIntakesAction } from "@/modules/server/presentation/actions/intake";
import { IntakesTable } from "@/modules/client/telemedicine/patient/component/ai-intake/list/IntakesTable";

/** Page-level page size — must match INITIAL_PAGE_SIZE in IntakesTable. */
const INITIAL_PAGE_SIZE = 10;

/**
 * AI Intake list server page.
 *
 * Pre-fetches the first page of intake records scoped to the logged-in patient
 * and passes them to IntakesTable as SSR seed data.
 */
export default async function PatientAiIntakePage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  /* Redirects to /patient/profile if no FHIR Patient record exists. */
  await requirePatientProfile();

  const userId = session.session.userId;
  const base = `/${locale}/bezs/telemedicine/patient`;

  /* Pre-fetch page 0 scoped to this patient's userId. */
  const [data] = await listIntakesAction({
    payload: {
      user_id: userId,
      limit: INITIAL_PAGE_SIZE,
      offset: 0,
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
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">AI Intake Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Your AI-assisted pre-appointment intake conversations.
        </p>
      </div>

      {/* ── Intake records table ── */}
      <IntakesTable
        initialData={initialData}
        userId={userId}
        appointmentViewHref={`${base}/appointments`}
      />
    </div>
  );
}
