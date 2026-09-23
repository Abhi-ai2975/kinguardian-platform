/**
 * deleteOrganizationUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: permanently delete an Organization and all its child records
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes an organization by its fhir-gql primary key (irreversible).
 *
 * @param id - The fhir-gql primary key.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteOrganizationUseCase(id: number): Promise<void> {
  const service = getInjection("IOrganizationsService");
  return service.delete(id);
}
