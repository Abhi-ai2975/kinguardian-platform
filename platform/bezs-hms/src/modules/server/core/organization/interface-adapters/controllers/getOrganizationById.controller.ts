/**
 * getOrganizationByIdController — interface adapter for fetching a single Organization.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetOrgByIdValidationSchema,
  TOrgResponse,
} from "@/modules/entities/schemas/organization";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getOrganizationByIdUseCase } from "../../application/usecases/getOrganizationById.usecase";

function presenter(data: TOrgResponse) {
  return data;
}

export type TGetOrganizationByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and fetches the matching organization.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @returns The organization record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getOrganizationByIdController(
  input: unknown
): Promise<TGetOrganizationByIdControllerOutput> {
  const parsed = await GetOrgByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getOrganizationByIdUseCase(parsed.data.id);
  return presenter(data);
}
