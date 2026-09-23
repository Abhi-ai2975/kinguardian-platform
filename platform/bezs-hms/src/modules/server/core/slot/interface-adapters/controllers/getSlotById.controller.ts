/**
 * getSlotByIdController — validates input and invokes the getById use case.
 *
 * Layer: server / core / slot / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetByIdSlotValidationSchema,
  type TSlotResponse,
} from "@/modules/entities/schemas/slot";
import { getSlotByIdUseCase } from "../../application/usecases/getSlotById.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TSlotResponse) {
  return data;
}

export type TGetSlotByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to getSlotByIdUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @returns The Slot resource with all embedded child arrays.
 * @throws InputParseError on schema validation failure.
 */
export async function getSlotByIdController(
  input: unknown,
): Promise<TGetSlotByIdControllerOutput> {
  const parsed = await GetByIdSlotValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getSlotByIdUseCase(parsed.data.id);
  return presenter(data);
}
