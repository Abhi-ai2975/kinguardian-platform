/**
 * getConsultationByFhirAppointmentIdUseCase — fetches a consultation by appointment.
 *
 * Layer: server / core / consultation / application / usecases
 *
 * Used by both the patient and doctor appointment detail pages to retrieve
 * the consultation record (room ID, status, reports) linked to a FHIR appointment.
 * Returns null when no consultation was provisioned for this appointment.
 */

import { getInjection } from "@/modules/server/di/container";
import type { TConsultationResponse } from "@/modules/entities/schemas/consultation";

/**
 * @param fhirAppointmentId - FHIR Appointment.id (integer).
 * @returns The linked Consultation or null.
 */
export async function getConsultationByFhirAppointmentIdUseCase(
  fhirAppointmentId: number,
): Promise<TConsultationResponse | null> {
  return getInjection("IConsultationRepository").getByFhirAppointmentId(
    fhirAppointmentId,
  );
}
