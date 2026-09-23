/**
 * abandonAiConsultation use case.
 *
 * Layer: server / core / ai-consultation / application
 *
 * Marks an in-progress AI consultation as ABANDONED.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TAbandonAiConsultation,
  TAiConsultationResponse,
} from "@/modules/entities/schemas/ai-consultation";

/**
 * Sets status to ABANDONED on the AiConsultation row.
 *
 * @param dto - id.
 * @returns The updated AiConsultation record.
 */
export async function abandonAiConsultationUseCase(
  dto: TAbandonAiConsultation,
): Promise<TAiConsultationResponse> {
  const repo = getInjection("IAiConsultationRepository");
  return repo.abandonAiConsultation(dto);
}
