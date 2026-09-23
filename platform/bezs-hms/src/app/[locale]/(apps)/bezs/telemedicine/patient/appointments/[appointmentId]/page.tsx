/**
 * Patient appointment detail page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/appointments/[appointmentId]
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /patient/profile if no FHIR Patient record exists.
 *
 * Data flow:
 *  1. Fetches appointment, intake, consultation, and encounter in parallel.
 *  2. If an encounter exists, fetches all 4 FHIR resource lists by encounter_id.
 *  3. Renders AppointmentDetailHeader + AppointmentReportTabs (Intake | Doctor tabs).
 *
 * The Doctor Report tab shows the SOAP note from the consultation full report
 * and the confirmed FHIR records (Conditions, Observations, Medications, Orders).
 * If the doctor hasn't completed the review yet, DoctorReportSection shows an
 * appropriate empty state message.
 */

import Link from "next/link";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { getAppointmentByIdAction } from "@/modules/server/presentation/actions/appointment";
import { getIntakeByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/intake";
import { getConsultationByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { listEncountersAction } from "@/modules/server/presentation/actions/encounter/core.actions";
import { listConditionsAction } from "@/modules/server/presentation/actions/condition/core.actions";
import { listObservationsAction } from "@/modules/server/presentation/actions/observation/core.actions";
import { listMedicationRequestsAction } from "@/modules/server/presentation/actions/medication-request/core.actions";
import { listServiceRequestsAction } from "@/modules/server/presentation/actions/service-request/core.actions";
import { listDiagnosticReportsAction } from "@/modules/server/presentation/actions/diagnostic-report";
import { AppointmentDetailHeader } from "@/modules/client/telemedicine/shared/components/appointment/AppointmentDetailHeader";
import { AppointmentReportTabs } from "@/modules/client/telemedicine/shared/components/appointment/AppointmentReportTabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TPaginatedConditionResponse } from "@/modules/entities/schemas/condition";
import type { TPaginatedObservationResponse } from "@/modules/entities/schemas/observation";
import type { TPaginatedMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TPaginatedServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TPaginatedDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import type { SoapNote } from "@/modules/client/telemedicine/doctor/component/appointment-review/types";

/** Route params for the dynamic segment. */
interface PatientAppointmentViewPageProps {
  params: Promise<{ appointmentId: string; locale: string }>;
}

/**
 * Patient-facing appointment detail page.
 *
 * Shows appointment metadata and two report tabs:
 *   Intake Report — AI pre-intake assessment + conversation transcript.
 *   Doctor Report — Post-consultation SOAP note + confirmed FHIR records.
 *
 * The Doctor Report tab is read-only; the patient cannot edit it.
 *
 * @param params - Dynamic route params ({ appointmentId, locale }).
 */
export default async function PatientAppointmentViewPage({
  params,
}: PatientAppointmentViewPageProps) {
  const { appointmentId } = await params;
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  await requirePatientProfile();

  const backHref = `/${locale}/bezs/telemedicine/patient/appointments`;
  const numericId = parseInt(appointmentId, 10);

  if (isNaN(numericId)) {
    return <AppointmentNotFound backHref={backHref} />;
  }

  /* Fetch appointment, intake, consultation, and encounter in parallel. */
  const [[appointment], [intake], [consultation], [encountersPage]] =
    await Promise.all([
      getAppointmentByIdAction({ payload: { id: numericId } }),
      getIntakeByFhirAppointmentIdAction({
        payload: { fhir_appointment_id: numericId },
      }),
      getConsultationByFhirAppointmentIdAction({
        payload: { fhir_appointment_id: numericId },
      }),
      listEncountersAction({ payload: { appointment_id: numericId, limit: 1 } }),
    ]);

  if (!appointment) {
    return <AppointmentNotFound backHref={backHref} />;
  }

  /* Extract encounter (if it exists) to query FHIR resources. */
  const encounter = (
    encountersPage as { data?: { id: number }[] } | null
  )?.data?.[0];

  /* Fetch FHIR clinical records if an encounter exists. */
  const [
    [conditionsPage],
    [observationsPage],
    [medicationsPage],
    [serviceRequestsPage],
    [diagnosticReportsPage],
  ] = encounter
    ? await Promise.all([
        listConditionsAction({
          payload: { encounter_id: encounter.id, limit: 200 },
        }),
        listObservationsAction({
          payload: { encounter_id: encounter.id, limit: 200 },
        }),
        listMedicationRequestsAction({
          payload: { encounter_id: encounter.id, limit: 200 },
        }),
        listServiceRequestsAction({
          payload: { encounter_id: encounter.id, limit: 200 },
        }),
        listDiagnosticReportsAction({
          payload: { encounter_id: encounter.id, limit: 200 },
        }),
      ])
    : [
        [null] as [null],
        [null] as [null],
        [null] as [null],
        [null] as [null],
        [null] as [null],
      ];

  const conditions =
    (conditionsPage as TPaginatedConditionResponse | null)?.data ?? [];
  const observations =
    (observationsPage as TPaginatedObservationResponse | null)?.data ?? [];
  const medications =
    (medicationsPage as TPaginatedMedicationRequestResponse | null)?.data ?? [];
  const serviceRequests =
    (serviceRequestsPage as TPaginatedServiceRequestResponse | null)?.data ?? [];
  const diagnosticReports =
    (diagnosticReportsPage as TPaginatedDiagnosticReportResponse | null)?.data ?? [];

  /* Extract SOAP note from the consultation full report. */
  const soapNote =
    (consultation?.full_report?.soap_report as { soap?: SoapNote } | null)
      ?.soap ?? null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Appointment header — date, status, doctor name, type */}
      <AppointmentDetailHeader
        appointment={appointment}
        backHref={backHref}
        perspective="patient"
      />

      {/* Tabbed report sections — isPatientView adds the Upload Result button to ServiceRequest cards */}
      <AppointmentReportTabs
        intake={intake}
        isPatientView
        /* Withholds the SOAP note until the doctor has approved it. Without
           this the patient reads raw agent output as though it were their
           doctor's written assessment. No FHIR fallback here: an unstamped
           consultation counts as unreviewed, which is the safe direction. */
        reviewed={consultation?.published_at != null}
        doctorReport={{
          soap: soapNote,
          conditions,
          observations,
          medications,
          serviceRequests,
          diagnosticReports,
        }}
      />
    </div>
  );
}

// ── Shared empty state ────────────────────────────────────────────────────────

/**
 * Renders a back button and empty-state card when the appointment is not found.
 *
 * @param backHref - URL to navigate back to the appointments list.
 */
function AppointmentNotFound({ backHref }: { backHref: string }) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="gap-1.5 -ml-2 text-muted-foreground"
      >
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          Back to Appointments
        </Link>
      </Button>
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Appointment not found.
        </CardContent>
      </Card>
    </div>
  );
}
