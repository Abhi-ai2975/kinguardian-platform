/**
 * listLocationsController — interface adapter for listing Locations.
 *
 * Layer: interface-adapters / controllers
 * Operation: list (paginated, filterable)
 *
 * Accepts optional query parameters. When no input is provided (undefined/null),
 * the use case is called with no filters and the server defaults apply.
 */

import {
  ListLocationsValidationSchema,
  TPaginatedLocationResponse,
} from "@/modules/entities/schemas/location";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listLocationsUseCase } from "../../application/usecases/listLocations.usecase";

/** Pass-through presenter — returns the paginated result as-is. */
function presenter(data: TPaginatedLocationResponse) {
  return data;
}

export type TListLocationsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates optional query params and lists locations.
 *
 * @param input - Optional raw query params (org_id, status, limit, offset).
 * @returns Paginated location list.
 * @throws InputParseError on Zod validation failure.
 */
export async function listLocationsController(
  input?: unknown
): Promise<TListLocationsControllerOutput> {
  // Allow calling with no args — just fetch with server defaults
  if (input === undefined || input === null) {
    const data = await listLocationsUseCase();
    return presenter(data);
  }
  const parsed = await ListLocationsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listLocationsUseCase(parsed.data);
  return presenter(data);
}
