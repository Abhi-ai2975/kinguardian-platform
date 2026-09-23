/**
 * updateObservationController — validates input and invokes the update use case.
 *
 * Layer: server / core / observation / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  UpdateObservationValidationSchema,
  type TObservationResponse,
} from "@/modules/entities/schemas/observation";
import { updateObservationUseCase } from "../../application/usecases/updateObservation.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TObservationResponse) {
  return data;
}

export type TUpdateObservationControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, strips `id` into a separate arg, and delegates to updateObservationUseCase.
 *
 * @param input - Raw unknown value from the server action (id + scalar patch fields).
 * @returns The updated Observation resource.
 * @throws InputParseError on schema validation failure.
 */
export async function updateObservationController(
  input: unknown,
): Promise<TUpdateObservationControllerOutput> {
  const parsed = await UpdateObservationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateObservationUseCase(id, dto);
  return presenter(data);
}
