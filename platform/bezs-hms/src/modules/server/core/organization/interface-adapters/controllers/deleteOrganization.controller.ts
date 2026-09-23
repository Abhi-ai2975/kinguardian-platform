/**
 * deleteOrganizationController — interface adapter for deleting an Organization.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete (irreversible — 204 No Content from fhir-gql)
 */

import { DeleteOrgValidationSchema } from "@/modules/entities/schemas/organization";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteOrganizationUseCase } from "../../application/usecases/deleteOrganization.usecase";

export type TDeleteOrganizationControllerOutput = void;

/**
 * Validates the id and deletes the organization.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteOrganizationController(
  input: unknown
): Promise<TDeleteOrganizationControllerOutput> {
  const parsed = await DeleteOrgValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteOrganizationUseCase(parsed.data.id);
}
