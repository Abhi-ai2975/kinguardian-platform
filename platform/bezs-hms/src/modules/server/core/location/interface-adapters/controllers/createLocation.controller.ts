/**
 * createLocationController — interface adapter for creating a Location.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 *
 * Validates the raw input against CreateLocationValidationSchema, calls the
 * use case, and passes the result through the presenter. Throws
 * InputParseError on invalid input.
 */

import {
  CreateLocationValidationSchema,
  TLocationResponse,
} from "@/modules/entities/schemas/location";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createLocationUseCase } from "../../application/usecases/createLocation.usecase";

/** Pass-through presenter — returns the location record as-is for now. */
function presenter(data: TLocationResponse) {
  return data;
}

export type TCreateLocationControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates and executes a location creation.
 *
 * @param input - Raw (unknown) payload from the server action.
 * @returns The created location record.
 * @throws InputParseError on Zod validation failure.
 */
export async function createLocationController(
  input: unknown
): Promise<TCreateLocationControllerOutput> {
  const parsed = await CreateLocationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createLocationUseCase(parsed.data);
  return presenter(data);
}
