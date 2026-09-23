/**
 * getLocationByIdController — interface adapter for fetching a single Location.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetLocationByIdValidationSchema,
  TLocationResponse,
} from "@/modules/entities/schemas/location";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getLocationByIdUseCase } from "../../application/usecases/getLocationById.usecase";

function presenter(data: TLocationResponse) {
  return data;
}

export type TGetLocationByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and fetches the matching location.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @returns The location record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getLocationByIdController(
  input: unknown
): Promise<TGetLocationByIdControllerOutput> {
  const parsed = await GetLocationByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getLocationByIdUseCase(parsed.data.id);
  return presenter(data);
}
