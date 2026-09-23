/**
 * completeConsultationUseCase — writes reports and marks consultation COMPLETED.
 *
 * Layer: server / core / consultation / application / usecases
 *
 * Called by the doctor on end-call. Persists the LiveKit transcript, the SOAP
 * note from doctor-report-agent, and the full merged report from full-report-agent,
 * then sets status to COMPLETED.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TConsultationResponse,
  TCompleteConsultation,
} from "@/modules/entities/schemas/consultation";

/**
 * @param dto - fhir_appointment_id, virtual_conversation, soap_note, full_report.
 * @returns The updated Consultation record.
 * @throws NotFoundError if no consultation exists for this appointment.
 */
export async function completeConsultationUseCase(
  dto: TCompleteConsultation,
): Promise<TConsultationResponse> {
  return getInjection("IConsultationRepository").complete(dto);
}
