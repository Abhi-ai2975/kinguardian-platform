/**
 * Clinical Records — clinical workspace page (step 3 of 3).
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/clinical-records/[patientId]/[appointmentId]
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record exists.
 *
 * Data flow:
 *  1. In parallel: appointment, consultation (the staging row), and every
 *     encounter for the appointment.
 *  2. Once the encounter is known, in parallel: the four published FHIR
 *     resource lists plus DiagnosticReports and DocumentReferences.
 *  3. All of it is handed to ClinicalWorkspace, which decides what to seed the
 *     editors from (published records → staged draft → AI report).
 *
 * Unlike the post-consultation review page this keeps *all* encounters rather
 * than just the first, so the Timeline tab can show every one the visit produced.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { getAppointmentByIdAction } from "@/modules/server/presentation/actions/appointment";
import { getConsultationByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { getIntakeByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/intake";
import { listEncountersAction } from "@/modules/server/presentation/actions/encounter/core.actions";
import { listConditionsAction } from "@/modules/server/presentation/actions/condition/core.actions";
import { listObservationsAction } from "@/modules/server/presentation/actions/observation/core.actions";
import { listMedicationRequestsAction } from "@/modules/server/presentation/actions/medication-request/core.actions";
import { listServiceRequestsAction } from "@/modules/server/presentation/actions/service-request/core.actions";
import { listDiagnosticReportsAction } from "@/modules/server/presentation/actions/diagnostic-report";
import { listDocumentReferencesAction } from "@/modules/server/presentation/actions/document-reference";
import { getParticipantName } from "@/modules/server/presentation/helpers/doctorPatients";
import { ClinicalWorkspace } from "@/modules/client/telemedicine/doctor/component/clinical-records/ClinicalWorkspace";
import { VisitOverview } from "@/modules/client/telemedicine/doctor/component/clinical-records/VisitOverview";
import { DoctorModalProvider } from "@/modules/client/telemedicine/doctor/provider/DoctorModalProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { TPaginatedEncounterResponse } from "@/modules/entities/schemas/encounter";
import type { TPaginatedConditionResponse } from "@/modules/entities/schemas/condition";
import type { TPaginatedObservationResponse } from "@/modules/entities/schemas/observation";
import type { TPaginatedMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TPaginatedServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TPaginatedDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import type { TPaginatedDocumentReferenceResponse } from "@/modules/entities/schemas/document-reference";

/** Route params for the dynamic segments. */
interface ClinicalWorkspacePageProps {
  params: Promise<{ patientId: string; appointmentId: string; locale: string }>;
}

/**
 * Clinical workspace for one appointment.
 *
 * @param params - Dynamic route params ({ patientId, appointmentId, locale }).
 */
export default async function ClinicalWorkspacePage({
  params,
}: ClinicalWorkspacePageProps) {
  const { patientId, appointmentId } = await params;
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  await requirePractitionerProfile();

  const numericPatientId = parseInt(patientId, 10);
  const numericAppointmentId = parseInt(appointmentId, 10);
  const backHref = `/${locale}/bezs/telemedicine/doctor/clinical-records/${patientId}`;

  if (isNaN(numericPatientId) || isNaN(numericAppointmentId)) {
    return <WorkspaceError backHref={backHref} message="Invalid record reference." />;
  }

  /* Appointment, staging row, intake and encounters are independent — fetch together. */
  const [[appointment], [consultation], [intake], [encountersPage]] =
    await Promise.all([
      getAppointmentByIdAction({ payload: { id: numericAppointmentId } }),
      getConsultationByFhirAppointmentIdAction({
        payload: { fhir_appointment_id: numericAppointmentId },
      }),
      getIntakeByFhirAppointmentIdAction({
        payload: { fhir_appointment_id: numericAppointmentId },
      }),
      listEncountersAction({
        payload: { appointment_id: numericAppointmentId, limit: 50 },
      }),
    ]);

  if (!appointment) {
    return <WorkspaceError backHref={backHref} message="Appointment not found." />;
  }

  const encounters =
    (encountersPage as TPaginatedEncounterResponse | null)?.data ?? [];

  /* Resources are linked to a single encounter; the first is the visit's own. */
  const encounterId = encounters[0]?.id ?? null;

  /* Display info from the appointment participants. */
  const patientName = getParticipantName(appointment, "Patient");
  const doctorName = getParticipantName(appointment, "Practitioner");

  /* Live transcript captured during the consultation, if there was one. */
  const transcript = consultation?.virtual_conversation ?? [];

  /*
   * No encounter means the consultation never completed, so there is nothing to
   * document against — every clinical resource links to an encounter. Show the
   * read-only visit view instead of the workspace, rather than sending the
   * doctor out to the old appointment detail page.
   */
  if (encounterId == null) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <BackLink href={backHref} />
        <VisitOverview
          appointment={appointment}
          patientName={patientName}
          doctorName={doctorName}
          intake={intake ?? null}
          transcript={transcript}
        />
      </div>
    );
  }

  /* Published records + attachments for the encounter. */
  const [
    [conditionsPage],
    [observationsPage],
    [medicationsPage],
    [serviceRequestsPage],
    [diagnosticReportsPage],
    [documentsPage],
  ] = await Promise.all([
    listConditionsAction({ payload: { encounter_id: encounterId, limit: 200 } }),
    listObservationsAction({ payload: { encounter_id: encounterId, limit: 200 } }),
    listMedicationRequestsAction({
      payload: { encounter_id: encounterId, limit: 200 },
    }),
    listServiceRequestsAction({
      payload: { encounter_id: encounterId, limit: 200 },
    }),
    listDiagnosticReportsAction({
      payload: { encounter_id: encounterId, limit: 200 },
    }),
    listDocumentReferencesAction({
      payload: { encounter_id: encounterId, limit: 200 },
    }),
  ]);

  const appointmentDate = appointment.start
    ? new Date(appointment.start).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-4 w-full">
      <BackLink href={backHref} />

      <ClinicalWorkspace
        appointmentId={numericAppointmentId}
        patientId={numericPatientId}
        appointment={appointment}
        encounters={encounters}
        encounterId={encounterId}
        patientName={patientName}
        doctorName={doctorName}
        appointmentDate={appointmentDate}
        savedConditions={
          (conditionsPage as TPaginatedConditionResponse | null)?.data ?? []
        }
        savedObservations={
          (observationsPage as TPaginatedObservationResponse | null)?.data ?? []
        }
        savedMedications={
          (medicationsPage as TPaginatedMedicationRequestResponse | null)?.data ?? []
        }
        savedServiceRequests={
          (serviceRequestsPage as TPaginatedServiceRequestResponse | null)?.data ?? []
        }
        diagnosticReports={
          (diagnosticReportsPage as TPaginatedDiagnosticReportResponse | null)
            ?.data ?? []
        }
        documents={
          (documentsPage as TPaginatedDocumentReferenceResponse | null)?.data ?? []
        }
        staged={{
          conditions: consultation?.conditions ?? null,
          observations: consultation?.observations ?? null,
          medicationRequests: consultation?.medication_requests ?? null,
          serviceRequests: consultation?.service_requests ?? null,
          soapNote: consultation?.soap_note ?? null,
        }}
        aiSoapNote={consultation?.full_report?.soap_report ?? null}
        /* Null means the note and entries are still AI suggestions awaiting
           review. Consultations written before this column existed have no
           stamp, so the workspace falls back to checking FHIR for them. */
        publishedAt={consultation?.published_at ?? null}
        consultationCreatedAt={consultation?.created_at ?? null}
        intake={intake ?? null}
        transcript={transcript}
      />

      {/* Upload modal singletons — controlled by the doctor Zustand store */}
      <DoctorModalProvider />
    </div>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────

/**
 * Back link to the patient's appointment list.
 * Shared by all three states this route can render (workspace, visit overview,
 * error) so they navigate identically.
 *
 * @param href - Target of the back link.
 */
function BackLink({ href }: { href: string }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="gap-1.5 -ml-2 text-muted-foreground print:hidden"
    >
      <Link href={href}>
        <ArrowLeft className="size-4" />
        Back to Appointments
      </Link>
    </Button>
  );
}

/**
 * Minimal error card with a back link.
 *
 * @param backHref - Where the back button navigates.
 * @param message - Human-readable reason for the failure.
 */
function WorkspaceError({
  backHref,
  message,
}: {
  backHref: string;
  message: string;
}) {
  return (
    <div className="max-w-md mx-auto mt-16 space-y-4">
      <BackLink href={backHref} />
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {message}
        </CardContent>
      </Card>
    </div>
  );
}
