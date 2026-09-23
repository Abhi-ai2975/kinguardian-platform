/**
 * deleteSlotController — validates input and invokes the delete use case.
 *
 * Layer: server / core / slot / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeleteSlotValidationSchema } from "@/modules/entities/schemas/slot";
import { deleteSlotUseCase } from "../../application/usecases/deleteSlot.usecase";

/**
 * Parses the raw input and delegates to deleteSlotUseCase.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @throws InputParseError on schema validation failure.
 */
export async function deleteSlotController(input: unknown): Promise<void> {
  const parsed = await DeleteSlotValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteSlotUseCase(parsed.data.id);
}
