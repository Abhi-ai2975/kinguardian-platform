/**
 * Post-consultation review page — doctor-side SOAP + clinical confirmation.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/appointments/[appointmentId]/review
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record exists.
 *
 * Data flow:
 *  1. Resolves the numeric appointmentId from route params.
 *  2. Fetches in parallel: appointment, consultation, encounter, and all 4 FHIR
 *     resource lists (Condition, Observation, MedicationRequest, ServiceRequest)
 *     filtered by encounter_id.
 *  3. Passes saved FHIR records to AppointmentReview for pre-population.
 *     On revisit the saved records are rehydrated into form state so doctor
 *     edits are preserved across page loads.
 *
 * On save, AppointmentReview diffs form state against loaded state and applies
 * CREATE / UPDATE / DELETE per resource in parallel.
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { getAppointmentByIdAction } from "@/modules/server/presentation/actions/appointment";
import { getConsultationByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { listEncountersAction } from "@/modules/server/presentation/actions/encounter/core.actions";
import { listConditionsAction } from "@/modules/server/presentation/actions/condition/core.actions";
import { listObservationsAction } from "@/modules/server/presentation/actions/observation/core.actions";
import { listMedicationRequestsAction } from "@/modules/server/presentation/actions/medication-request/core.actions";
import { listServiceRequestsAction } from "@/modules/server/presentation/actions/service-request/core.actions";
import { AppointmentReview } from "@/modules/client/telemedicine/doctor/component/appointment-review/AppointmentReview";
import { Card, CardContent } from "@/components/ui/card";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TPaginatedConditionResponse } from "@/modules/entities/schemas/condition";
import type { TPaginatedObservationResponse } from "@/modules/entities/schemas/observation";
import type { TPaginatedMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TPaginatedServiceRequestResponse } from "@/modules/entities/schemas/service-request";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the display name of the first matching participant.
 *
 * @param appointment - Full appointment response.
 * @param type - "Practitioner" or "Patient".
 */
function getParticipantName(
  appointment: TAppointmentResponse,
  type: "Practitioner" | "Patient",
): string {
  return (
    appointment.participant?.find((p) => p.reference_type === type)
      ?.reference_display ?? (type === "Patient" ? "Patient" : "Doctor")
  );
}

/**
 * Returns the integer FHIR resource ID of the first matching participant.
 *
 * @param appointment - Full appointment response.
 * @param type - "Practitioner" or "Patient".
 */
function getParticipantId(
  appointment: TAppointmentResponse,
  type: "Practitioner" | "Patient",
): number | undefined {
  const id = appointment.participant?.find(
    (p) => p.reference_type === type,
  )?.reference_id;
  return id ?? undefined;
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** Route params for the dynamic segment. */
interface ReviewPageProps {
  params: Promise<{ appointmentId: string; locale: string }>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * Post-consultation review server page.
 * Resolves appointment, consultation, encounter, and saved FHIR resource data
 * server-side before rendering the client AppointmentReview component.
 *
 * @param params - Dynamic route params ({ appointmentId, locale }).
 */
export default async function DoctorAppointmentReviewPage({
  params,
}: ReviewPageProps) {
  const { appointmentId } = await params;
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  await requirePractitionerProfile();

  const numericId = parseInt(appointmentId, 10);

  if (isNaN(numericId)) {
    return <ReviewError message="Invalid appointment ID." />;
  }

  /* Fetch appointment, consultation, and encounter in parallel. */
  const [[appointment], [consultation], [encountersPage]] = await Promise.all([
    getAppointmentByIdAction({ payload: { id: numericId } }),
    getConsultationByFhirAppointmentIdAction({
      payload: { fhir_appointment_id: numericId },
    }),
    listEncountersAction({ payload: { appointment_id: numericId, limit: 1 } }),
  ]);

  if (!appointment) {
    return <ReviewError message="Appointment not found." />;
  }

  /* Derive display info from appointment participants. */
  const patientName = getParticipantName(appointment, "Patient");
  const doctorName = getParticipantName(appointment, "Practitioner");
  const patientId = getParticipantId(appointment, "Patient");

  /* Format appointment date for display in the header. */
  const appointmentDate = appointment.start
    ? new Date(appointment.start).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  /* The encounter links all created FHIR resources. May be undefined if creation raced. */
  const encounters =
    (encountersPage as { data?: { id: number }[] } | null)?.data ?? [];
  const encounter = encounters[0];

  if (!encounter) {
    return (
      <ReviewError message="Encounter not yet available — please refresh in a moment." />
    );
  }

  /*
   * Fetch all 4 FHIR resource lists linked to this encounter in parallel.
   * These are the records saved from a previous doctor review session (if any).
   * On first visit all lists will be empty — the AI report seeds the form instead.
   */
  const [
    [conditionsPage],
    [observationsPage],
    [medicationsPage],
    [serviceRequestsPage],
  ] = await Promise.all([
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
  ]);

  const savedConditions =
    (conditionsPage as TPaginatedConditionResponse | null)?.data ?? [];
  const savedObservations =
    (observationsPage as TPaginatedObservationResponse | null)?.data ?? [];
  const savedMedications =
    (medicationsPage as TPaginatedMedicationRequestResponse | null)?.data ?? [];
  const savedServiceRequests =
    (serviceRequestsPage as TPaginatedServiceRequestResponse | null)?.data ??
    [];

  return (
    <AppointmentReview
      fhirAppointmentId={numericId}
      patientId={patientId ?? 0}
      encounterId={encounter.id}
      patientName={patientName}
      doctorName={doctorName}
      appointmentDate={appointmentDate}
      fullReport={consultation?.full_report?.soap_report ?? null}
      savedConditions={savedConditions}
      savedObservations={savedObservations}
      savedMedications={savedMedications}
      savedServiceRequests={savedServiceRequests}
    />
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

/**
 * Minimal error card shown when the review data cannot be loaded.
 *
 * @param message - Human-readable reason for the failure.
 */
function ReviewError({ message }: { message: string }) {
  return (
    <div className="max-w-md mx-auto mt-20">
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {message}
        </CardContent>
      </Card>
    </div>
  );
}
