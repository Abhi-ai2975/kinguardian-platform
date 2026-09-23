/**
 * updateLocationController — interface adapter for partially updating a Location.
 *
 * Layer: interface-adapters / controllers
 * Operation: update (PATCH — scalar fields only, see PatchLocationDtoSchema)
 *
 * Splits id from the dto before passing to the use case, matching the service
 * interface signature update(id, dto).
 */

import {
  PatchLocationDtoSchema,
  PatchLocationValidationSchema,
  TLocationResponse,
} from "@/modules/entities/schemas/location";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateLocationUseCase } from "../../application/usecases/updateLocation.usecase";

function presenter(data: TLocationResponse) {
  return data;
}

export type TUpdateLocationControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload and applies the update.
 *
 * @param input - Raw payload: `{ id: number, ...patchable scalar fields }`.
 * @returns The updated location record.
 * @throws InputParseError | ValidationError | NotFoundError
 */
export async function updateLocationController(
  input: unknown
): Promise<TUpdateLocationControllerOutput> {
  const parsed = await PatchLocationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const { id, ...dto } = parsed.data;
  // Validate the dto portion independently so the error message is precise.
  const dtoParsed = await PatchLocationDtoSchema.safeParseAsync(dto);
  if (!dtoParsed.success) throw new InputParseError(dtoParsed.error);

  const data = await updateLocationUseCase(id, dtoParsed.data);
  return presenter(data);
}
