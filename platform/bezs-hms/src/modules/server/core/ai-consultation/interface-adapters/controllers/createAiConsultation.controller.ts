/**
 * createAiConsultation controller.
 *
 * Layer: server / core / ai-consultation / interface-adapters / controllers
 */

import {
  CreateAiConsultationValidationSchema,
  type TAiConsultationResponse,
} from "@/modules/entities/schemas/ai-consultation";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createAiConsultationUseCase } from "../../application/usecases/createAiConsultation.usecase";

function presenter(data: TAiConsultationResponse) {
  return data;
}

export type TCreateAiConsultationControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the create payload and delegates to the use case.
 *
 * @param input - Raw create payload (userId injected by action).
 * @returns Created AiConsultation record.
 * @throws InputParseError on validation failure.
 */
export async function createAiConsultationController(
  input: unknown,
): Promise<TCreateAiConsultationControllerOutput> {
  const parsed = await CreateAiConsultationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await createAiConsultationUseCase(parsed.data));
}
