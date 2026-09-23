/**
 * updateAiConsultation use case.
 *
 * Layer: server / core / ai-consultation / application
 *
 * Saves the conversation transcript and AI report, flips status to COMPLETED.
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TUpdateAiConsultation,
  TAiConsultationResponse,
} from "@/modules/entities/schemas/ai-consultation";

/**
 * Delegates AI consultation update to the injected repository.
 *
 * @param dto - id, conversation, optional report.
 * @returns The updated AiConsultation record.
 */
export async function updateAiConsultationUseCase(
  dto: TUpdateAiConsultation,
): Promise<TAiConsultationResponse> {
  const repo = getInjection("IAiConsultationRepository");
  return repo.updateAiConsultation(dto);
}
