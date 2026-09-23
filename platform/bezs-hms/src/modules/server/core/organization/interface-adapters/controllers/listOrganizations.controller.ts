/**
 * listOrganizationsController — interface adapter for listing Organizations.
 *
 * Layer: interface-adapters / controllers
 * Operation: list (paginated, filterable)
 *
 * Accepts optional query parameters. When no input is provided (undefined/null),
 * the use case is called with no filters and the server defaults apply.
 */

import {
  ListOrgsValidationSchema,
  TPaginatedOrgResponse,
} from "@/modules/entities/schemas/organization";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listOrganizationsUseCase } from "../../application/usecases/listOrganizations.usecase";

/** Pass-through presenter — returns the paginated result as-is. */
function presenter(data: TPaginatedOrgResponse) {
  return data;
}

export type TListOrganizationsControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates optional query params and lists organizations.
 *
 * @param input - Optional raw query params (name, active, limit, offset).
 * @returns Paginated organization list.
 * @throws InputParseError on Zod validation failure.
 */
export async function listOrganizationsController(
  input?: unknown
): Promise<TListOrganizationsControllerOutput> {
  // Allow calling with no args — just fetch with server defaults
  if (input === undefined || input === null) {
    const data = await listOrganizationsUseCase();
    return presenter(data);
  }
  const parsed = await ListOrgsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listOrganizationsUseCase(parsed.data);
  return presenter(data);
}
