/**
 * createConsultationController — validates input and provisions the consultation room.
 *
 * Layer: server / core / consultation / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreateConsultationValidationSchema,
  type TConsultationResponse,
} from "@/modules/entities/schemas/consultation";
import { createConsultationUseCase } from "../../application/usecases/createConsultation.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TConsultationResponse) {
  return data;
}

export type TCreateConsultationControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to createConsultationUseCase, presents result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The newly created Consultation record.
 * @throws InputParseError on schema validation failure.
 */
export async function createConsultationController(
  input: unknown,
): Promise<TCreateConsultationControllerOutput> {
  const parsed = await CreateConsultationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createConsultationUseCase(parsed.data);
  return presenter(data);
}
