/**
 * abandonAiConsultation controller.
 *
 * Layer: server / core / ai-consultation / interface-adapters / controllers
 */

import {
  AbandonAiConsultationValidationSchema,
  type TAiConsultationResponse,
} from "@/modules/entities/schemas/ai-consultation";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { abandonAiConsultationUseCase } from "../../application/usecases/abandonAiConsultation.usecase";

function presenter(data: TAiConsultationResponse) {
  return data;
}

export type TAbandonAiConsultationControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw abandon payload (id).
 * @returns Updated AiConsultation record with status ABANDONED.
 * @throws InputParseError on validation failure.
 */
export async function abandonAiConsultationController(
  input: unknown,
): Promise<TAbandonAiConsultationControllerOutput> {
  const parsed = await AbandonAiConsultationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await abandonAiConsultationUseCase(parsed.data));
}
