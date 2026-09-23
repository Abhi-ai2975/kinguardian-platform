/**
 * saveClinicalDataUseCase — writes extracted FHIR clinical resources.
 *
 * Layer: server / core / consultation / application / usecases
 *
 * Called in the post-consultation review step after the doctor triggers
 * the clinical-extraction-agent. Persists the extracted service requests,
 * medication requests, observations, and conditions as JSON arrays on the
 * Consultation record.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TConsultationResponse,
  TSaveClinicalData,
} from "@/modules/entities/schemas/consultation";

/**
 * @param dto - fhir_appointment_id + resource arrays (service_requests, etc.).
 * @returns The updated Consultation record.
 * @throws NotFoundError if no consultation exists for this appointment.
 */
export async function saveClinicalDataUseCase(
  dto: TSaveClinicalData,
): Promise<TConsultationResponse> {
  return getInjection("IConsultationRepository").saveClinicalData(dto);
}
