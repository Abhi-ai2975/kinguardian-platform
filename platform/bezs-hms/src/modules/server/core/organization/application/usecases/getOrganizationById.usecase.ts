/**
 * getOrganizationByIdUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: fetch a single Organization by its numeric ID
 */

import { TOrgResponse } from "@/modules/entities/schemas/organization";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single organization by its fhir-gql primary key.
 *
 * @param id - The fhir-gql primary key for this organization.
 * @returns The matching organization record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getOrganizationByIdUseCase(
  id: number
): Promise<TOrgResponse> {
  const service = getInjection("IOrganizationsService");
  return service.getById(id);
}
