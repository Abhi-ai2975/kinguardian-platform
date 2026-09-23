/**
 * createSlotController — validates input and invokes the create use case.
 *
 * Layer: server / core / slot / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreateSlotValidationSchema,
  type TSlotResponse,
} from "@/modules/entities/schemas/slot";
import { createSlotUseCase } from "../../application/usecases/createSlot.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TSlotResponse) {
  return data;
}

export type TCreateSlotControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to createSlotUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The created Slot resource.
 * @throws InputParseError on schema validation failure.
 */
export async function createSlotController(
  input: unknown,
): Promise<TCreateSlotControllerOutput> {
  const parsed = await CreateSlotValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createSlotUseCase(parsed.data);
  return presenter(data);
}
