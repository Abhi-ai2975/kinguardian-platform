/**
 * getAiConsultationById use case.
 *
 * Layer: server / core / ai-consultation / application
 *
 * Fetches a single AI consultation by its local integer ID.
 */

import { getInjection } from "@/modules/server/di/container";
import type { TAiConsultationResponse } from "@/modules/entities/schemas/ai-consultation";

/**
 * Delegates lookup to the injected repository.
 *
 * @param id - AiConsultation.id.
 * @returns The AiConsultation record.
 * @throws NotFoundError if not found.
 */
export async function getAiConsultationByIdUseCase(
  id: number,
): Promise<TAiConsultationResponse> {
  const repo = getInjection("IAiConsultationRepository");
  return repo.getById(id);
}
