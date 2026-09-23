/**
 * AI Consultation list page — patient portal.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/ai-consultation
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /patient/profile if no FHIR Patient record exists.
 *
 * Data flow:
 *  SSR → listConsultationsAction(user_id, page 0)
 *      → ConsultationsTable (initialData, userId props)
 *  Client → useQuery → fetchPatientConsultations → re-renders on page/filter change
 *
 * Shows all AI Consultation sessions the patient has participated in, scoped to
 * their Better Auth userId. Each row links to the associated appointment detail page
 * via fhir_appointment_id.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { listConsultationsAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { ConsultationsTable } from "@/modules/client/telemedicine/patient/component/ai-consultation/list/ConsultationsTable";

/** Page-level page size — must match INITIAL_PAGE_SIZE in ConsultationsTable. */
const INITIAL_PAGE_SIZE = 10;

/**
 * AI Consultation list server page.
 *
 * Pre-fetches the first page of consultation records scoped to the logged-in
 * patient and passes them to ConsultationsTable as SSR seed data.
 */
export default async function PatientAiConsultationPage() {
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
  const [data] = await listConsultationsAction({
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
        <h1 className="text-2xl font-semibold">AI Consultations</h1>
        <p className="text-sm text-muted-foreground">
          Your virtual consultation sessions with AI-assisted clinical summaries.
        </p>
      </div>

      {/* ── Consultation records table ── */}
      <ConsultationsTable
        initialData={initialData}
        userId={userId}
        appointmentViewHref={`${base}/appointments`}
      />
    </div>
  );
}
