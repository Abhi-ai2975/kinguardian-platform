/**
 * createConsultationUseCase — provisions a virtual consultation room.
 *
 * Layer: server / core / consultation / application / usecases
 *
 * Called immediately after a FHIR appointment is booked. Delegates to
 * IConsultationRepository which generates a unique LiveKit room ID and
 * persists the record with status WAITING.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TConsultationResponse,
  TCreateConsultation,
} from "@/modules/entities/schemas/consultation";

/**
 * Creates a new WAITING consultation with a generated LiveKit room ID.
 *
 * @param dto - fhir_appointment_id, user_id, optional org_id.
 * @returns The newly created Consultation record.
 */
export async function createConsultationUseCase(
  dto: TCreateConsultation,
): Promise<TConsultationResponse> {
  return getInjection("IConsultationRepository").create(dto);
}
