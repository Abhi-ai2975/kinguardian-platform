/**
 * abandonConsultationUseCase — marks a consultation as ABANDONED.
 *
 * Layer: server / core / consultation / application / usecases
 *
 * Called when the patient leaves the room before the doctor ends the
 * consultation, or when the session times out without a report being generated.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TConsultationResponse,
  TAbandonConsultation,
} from "@/modules/entities/schemas/consultation";

/**
 * @param dto - fhir_appointment_id.
 * @returns The updated Consultation record with status ABANDONED.
 * @throws NotFoundError if no consultation exists for this appointment.
 */
export async function abandonConsultationUseCase(
  dto: TAbandonConsultation,
): Promise<TConsultationResponse> {
  return getInjection("IConsultationRepository").abandon(dto);
}
