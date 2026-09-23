/**
 * listSlotsController — validates input and invokes the list use case.
 *
 * Layer: server / core / slot / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListSlotsValidationSchema,
  type TPaginatedSlotResponse,
} from "@/modules/entities/schemas/slot";
import { listSlotsUseCase } from "../../application/usecases/listSlots.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPaginatedSlotResponse) {
  return data;
}

export type TListSlotsControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to listSlotsUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (query params).
 * @returns Paginated list of Slots.
 * @throws InputParseError on schema validation failure.
 */
export async function listSlotsController(
  input: unknown,
): Promise<TListSlotsControllerOutput> {
  const parsed = await ListSlotsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listSlotsUseCase(parsed.data);
  return presenter(data);
}
