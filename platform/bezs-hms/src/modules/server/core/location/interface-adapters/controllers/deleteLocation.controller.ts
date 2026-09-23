/**
 * deleteLocationController — interface adapter for deleting a Location.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete (irreversible — 204 No Content from fhir-gql)
 */

import { DeleteLocationValidationSchema } from "@/modules/entities/schemas/location";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteLocationUseCase } from "../../application/usecases/deleteLocation.usecase";

export type TDeleteLocationControllerOutput = void;

/**
 * Validates the id and deletes the location.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteLocationController(
  input: unknown
): Promise<TDeleteLocationControllerOutput> {
  const parsed = await DeleteLocationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteLocationUseCase(parsed.data.id);
}
