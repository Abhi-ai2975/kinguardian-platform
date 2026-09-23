/**
 * listHealthcareServicesController — interface adapter for listing HealthcareServices.
 *
 * Layer: interface-adapters / controllers
 * Operation: list (paginated, filterable)
 *
 * Accepts optional query parameters. When no input is provided (undefined/null),
 * the use case is called with no filters and the server defaults apply.
 */

import {
  ListHealthcareServicesValidationSchema,
  TPaginatedHealthcareServiceResponse,
} from "@/modules/entities/schemas/healthcare-service";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listHealthcareServicesUseCase } from "../../application/usecases/listHealthcareServices.usecase";

/** Pass-through presenter — returns the paginated result as-is. */
function presenter(data: TPaginatedHealthcareServiceResponse) {
  return data;
}

export type TListHealthcareServicesControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates optional query params and lists healthcare services.
 *
 * @param input - Optional raw query params (name, active, limit, offset).
 * @returns Paginated healthcare service list.
 * @throws InputParseError on Zod validation failure.
 */
export async function listHealthcareServicesController(
  input?: unknown
): Promise<TListHealthcareServicesControllerOutput> {
  if (input === undefined || input === null) {
    const data = await listHealthcareServicesUseCase();
    return presenter(data);
  }
  const parsed = await ListHealthcareServicesValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listHealthcareServicesUseCase(parsed.data);
  return presenter(data);
}
