/**
 * Doctor in-person consultation page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/doctor/appointments/inperson-consultation
 *        ?appointmentId=<fhir_appointment_id>
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record exists.
 *  3. Returns an error card when appointmentId is missing or invalid.
 *
 * Data flow:
 *  1. Reads appointmentId from query params.
 *  2. Fetches the FHIR appointment to derive doctor/patient display names.
 *  3. Checks if a Consultation record already exists for this appointment;
 *     if not, provisions one via createConsultationAction so that
 *     completeConsultationAction can find it by fhir_appointment_id on end-call.
 *  4. Renders InPersonConsultation with all props needed for the end-call pipeline.
 */

import { redirect } from "@/i18n/navigation";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { getAppointmentByIdAction } from "@/modules/server/presentation/actions/appointment";
import {
  getConsultationByFhirAppointmentIdAction,
  createConsultationAction,
} from "@/modules/server/presentation/actions/consultation/core.actions";
import { InPersonConsultation } from "@/modules/client/telemedicine/doctor/component/in-person-consultation/InPersonConsultation";
import { Card, CardContent } from "@/components/ui/card";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Participant helpers (mirrors online-consultation/page.tsx) ─────────────────

/** Derives the display name of the first participant matching the given FHIR reference_type. */
function getParticipantName(
  appointment: TAppointmentResponse,
  type: "Practitioner" | "Patient",
): string | undefined {
  return (
    appointment.participant?.find((p) => p.reference_type === type)
      ?.reference_display ?? undefined
  );
}

/** Derives the integer FHIR resource ID of the first matching participant. */
function getParticipantId(
  appointment: TAppointmentResponse,
  type: "Practitioner" | "Patient",
): number | undefined {
  const id = appointment.participant?.find(
    (p) => p.reference_type === type,
  )?.reference_id;
  return id ?? undefined;
}

// ── Page props ────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ appointmentId?: string }>;
  params: Promise<{ locale: string }>;
}

/**
 * Doctor-facing in-person consultation recording page.
 *
 * Ensures a Consultation DB record exists for this appointment (creating one if
 * needed) so the end-call pipeline can call completeConsultationAction by
 * fhir_appointment_id.
 */
export default async function DoctorInPersonConsultationPage({
  searchParams,
  params,
}: PageProps) {
  const { appointmentId } = await searchParams;
  const { locale } = await params;
  const session = await getServerSession();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  await requirePractitionerProfile();

  const numericId = appointmentId ? parseInt(appointmentId, 10) : NaN;

  if (isNaN(numericId)) {
    return <NotFound message="Invalid or missing appointment ID." />;
  }

  // Fetch appointment for participant names
  const [appointment] = await getAppointmentByIdAction({
    payload: { id: numericId },
  });

  if (!appointment) {
    return <NotFound message="Appointment not found." />;
  }

  // Ensure a Consultation record exists for this appointment.
  // completeConsultationAction looks up by fhir_appointment_id — the record
  // must exist before the doctor ends the in-person session.
  const [existingConsultation] = await getConsultationByFhirAppointmentIdAction({
    payload: { fhir_appointment_id: numericId },
  });

  if (!existingConsultation) {
    // Provision a consultation record (room_id is created but will go unused for in-person)
    const [, createErr] = await createConsultationAction({
      payload: {
        fhir_appointment_id: numericId,
        org_id: session.session.activeOrganizationId ?? undefined,
      },
    });

    if (createErr) {
      return (
        <NotFound message="Could not provision a consultation record for this appointment. Please try again." />
      );
    }
  }

  const doctorName =
    getParticipantName(appointment, "Practitioner") ??
    session.user.name ??
    "Doctor";
  const patientName = getParticipantName(appointment, "Patient");
  const patientId = getParticipantId(appointment, "Patient");
  const practitionerId = getParticipantId(appointment, "Practitioner");

  // Derive the locale-prefixed base path for post-consultation navigation
  return (
    <div className="h-full">
      <InPersonConsultation
        fhirAppointmentId={numericId}
        doctorName={doctorName}
        patientName={patientName}
        patientId={patientId}
        practitionerId={practitionerId}
        orgId={session.session.activeOrganizationId ?? undefined}
      />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

/**
 * Minimal error card shown when the consultation page cannot be loaded.
 *
 * @param message - Human-readable reason for the failure.
 */
function NotFound({ message }: { message: string }) {
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
