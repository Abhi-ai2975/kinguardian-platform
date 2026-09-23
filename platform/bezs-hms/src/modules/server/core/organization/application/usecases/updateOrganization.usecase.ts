/**
 * updateOrganizationUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: partially update an Organization (PATCH — only name, active, partof_display)
 */

import {
  TOrgResponse,
  TPatchOrgDto,
} from "@/modules/entities/schemas/organization";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates an organization with the given patchable fields.
 *
 * @param id  - The fhir-gql primary key.
 * @param dto - Fields to patch (active, name, partof_display — at least one required).
 * @returns The updated organization record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateOrganizationUseCase(
  id: number,
  dto: TPatchOrgDto
): Promise<TOrgResponse> {
  const service = getInjection("IOrganizationsService");
  return service.update(id, dto);
}
