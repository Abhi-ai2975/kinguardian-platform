/**
 * generateSlotsController — validates input and invokes the generate use case.
 *
 * Layer: server / core / slot / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GenerateSlotsValidationSchema,
  type TSlotGenerateResponse,
} from "@/modules/entities/schemas/slot";
import { generateSlotsUseCase } from "../../application/usecases/generateSlots.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TSlotGenerateResponse) {
  return data;
}

export type TGenerateSlotsControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to generateSlotsUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns Summary with generated_count, slot_ids, and the generation window used.
 * @throws InputParseError on schema validation failure.
 */
export async function generateSlotsController(
  input: unknown,
): Promise<TGenerateSlotsControllerOutput> {
  const parsed = await GenerateSlotsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await generateSlotsUseCase(parsed.data);
  return presenter(data);
}
