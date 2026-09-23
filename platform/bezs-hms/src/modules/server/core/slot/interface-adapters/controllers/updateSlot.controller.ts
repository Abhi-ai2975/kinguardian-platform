/**
 * updateSlotController — validates input and invokes the update use case.
 *
 * Layer: server / core / slot / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  UpdateSlotValidationSchema,
  type TSlotResponse,
} from "@/modules/entities/schemas/slot";
import { updateSlotUseCase } from "../../application/usecases/updateSlot.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TSlotResponse) {
  return data;
}

export type TUpdateSlotControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, splits id from patch body, delegates to updateSlotUseCase.
 *
 * @param input - Raw unknown value from the server action (must contain { id, ...patchFields }).
 * @returns The updated Slot resource.
 * @throws InputParseError on schema validation failure.
 */
export async function updateSlotController(
  input: unknown,
): Promise<TUpdateSlotControllerOutput> {
  const parsed = await UpdateSlotValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateSlotUseCase(id, dto);
  return presenter(data);
}
