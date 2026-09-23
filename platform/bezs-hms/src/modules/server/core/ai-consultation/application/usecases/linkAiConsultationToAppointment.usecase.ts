/**
 * linkAiConsultationToAppointment use case.
 *
 * Layer: server / core / ai-consultation / application
 *
 * Links a completed AI consultation to a follow-up FHIR appointment.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TLinkAiConsultation,
  TAiConsultationResponse,
} from "@/modules/entities/schemas/ai-consultation";

/**
 * Sets fhir_appointment_id on the AiConsultation row.
 *
 * @param dto - id, fhir_appointment_id.
 * @returns The updated AiConsultation record.
 */
export async function linkAiConsultationToAppointmentUseCase(
  dto: TLinkAiConsultation,
): Promise<TAiConsultationResponse> {
  const repo = getInjection("IAiConsultationRepository");
  return repo.linkToAppointment(dto);
}
