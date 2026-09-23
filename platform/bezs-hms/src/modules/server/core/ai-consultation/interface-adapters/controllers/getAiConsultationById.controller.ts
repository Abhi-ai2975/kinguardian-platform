/**
 * getAiConsultationById controller.
 *
 * Layer: server / core / ai-consultation / interface-adapters / controllers
 */

import {
  GetAiConsultationByIdValidationSchema,
  type TAiConsultationResponse,
} from "@/modules/entities/schemas/ai-consultation";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getAiConsultationByIdUseCase } from "../../application/usecases/getAiConsultationById.usecase";

function presenter(data: TAiConsultationResponse) {
  return data;
}

export type TGetAiConsultationByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw payload (id).
 * @returns AiConsultation record.
 * @throws InputParseError on validation failure.
 * @throws NotFoundError if not found.
 */
export async function getAiConsultationByIdController(
  input: unknown,
): Promise<TGetAiConsultationByIdControllerOutput> {
  const parsed = await GetAiConsultationByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await getAiConsultationByIdUseCase(parsed.data.id));
}
