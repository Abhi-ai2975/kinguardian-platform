/**
 * createAiConsultation use case.
 *
 * Layer: server / core / ai-consultation / application
 *
 * Creates a new IN_PROGRESS AI consultation session for the authenticated patient.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TCreateAiConsultation,
  TAiConsultationResponse,
} from "@/modules/entities/schemas/ai-consultation";

/**
 * Delegates AI consultation creation to the injected repository.
 *
 * @param dto - userId, org_id, optional patient_fhir_id, mode.
 * @returns The created AiConsultation record.
 */
export async function createAiConsultationUseCase(
  dto: TCreateAiConsultation,
): Promise<TAiConsultationResponse> {
  const repo = getInjection("IAiConsultationRepository");
  return repo.createAiConsultation(dto);
}
