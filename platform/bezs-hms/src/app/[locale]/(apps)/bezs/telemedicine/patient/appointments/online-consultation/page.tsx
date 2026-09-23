/**
 * Patient online-consultation page.
 *
 * Route: /[locale]/(apps)/bezs/telemedicine/patient/appointments/online-consultation
 *        ?appointmentId=<fhir_appointment_id>
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /patient/profile if no FHIR Patient record exists.
 *  3. Returns 404-style card when the Consultation record doesn't exist.
 *
 * Data flow:
 *  1. Reads appointmentId from query params.
 *  2. Fetches the FHIR appointment to derive doctor/patient display names.
 *  3. Fetches the Consultation record to get the LiveKit room_id.
 *  4. Passes room_id + display names to PatientConsult (client).
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePatientProfile } from "@/modules/server/auth/require-profile";
import { getAppointmentByIdAction } from "@/modules/server/presentation/actions/appointment";
import { getConsultationByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/consultation/core.actions";
import { PatientConsult } from "@/modules/client/telemedicine/patient/component/online-consultation/PatientConsult";
import { Card, CardContent } from "@/components/ui/card";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

/** Derives the first participant with the given FHIR reference_type. */
function getParticipantName(
  appointment: TAppointmentResponse,
  type: "Practitioner" | "Patient",
): string | undefined {
  return appointment.participant?.find((p) => p.reference_type === type)
    ?.reference_display ?? undefined;
}

/** Derives specialty from the first specialty coding. */
function getSpecialty(appointment: TAppointmentResponse): string {
  return (
    appointment.specialty?.[0]?.coding_display ??
    appointment.appointment_type_display ??
    "Consultation"
  );
}

interface PageProps {
  searchParams: Promise<{ appointmentId?: string }>;
}

/**
 * Patient-facing virtual consultation page.
 * Resolves the LiveKit room from the Consultation record and renders
 * the PatientConsult room UI.
 */
export default async function PatientOnlineConsultationPage({ searchParams }: PageProps) {
  const { appointmentId } = await searchParams;
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  await requirePatientProfile();

  const numericId = appointmentId ? parseInt(appointmentId, 10) : NaN;

  if (isNaN(numericId)) {
    return <NotFound message="Invalid appointment ID." />;
  }

  const [[appointment], [consultation]] = await Promise.all([
    getAppointmentByIdAction({ payload: { id: numericId } }),
    getConsultationByFhirAppointmentIdAction({
      payload: { fhir_appointment_id: numericId },
    }),
  ]);

  if (!appointment) {
    return <NotFound message="Appointment not found." />;
  }

  if (!consultation) {
    return <NotFound message="No virtual consultation room was provisioned for this appointment." />;
  }

  const doctorName = getParticipantName(appointment, "Practitioner");
  const patientName = getParticipantName(appointment, "Patient");
  const specialty = getSpecialty(appointment);

  return (
    <div className="h-full">
      <PatientConsult
        roomId={consultation.room_id}
        fhirAppointmentId={numericId}
        participantName={patientName ?? session.user.name ?? "Patient"}
        details={{
          doctor: { name: doctorName, speciality: specialty },
          patient: { name: patientName ?? session.user.name },
        }}
      />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

/**
 * Minimal error card shown when the consultation cannot be loaded.
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
