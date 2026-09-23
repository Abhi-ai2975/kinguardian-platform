/**
 * updateAiConsultation controller.
 *
 * Layer: server / core / ai-consultation / interface-adapters / controllers
 */

import {
  UpdateAiConsultationValidationSchema,
  type TAiConsultationResponse,
} from "@/modules/entities/schemas/ai-consultation";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateAiConsultationUseCase } from "../../application/usecases/updateAiConsultation.usecase";

function presenter(data: TAiConsultationResponse) {
  return data;
}

export type TUpdateAiConsultationControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw update payload (id, conversation, optional report).
 * @returns Updated AiConsultation record.
 * @throws InputParseError on validation failure.
 */
export async function updateAiConsultationController(
  input: unknown,
): Promise<TUpdateAiConsultationControllerOutput> {
  const parsed = await UpdateAiConsultationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await updateAiConsultationUseCase(parsed.data));
}
