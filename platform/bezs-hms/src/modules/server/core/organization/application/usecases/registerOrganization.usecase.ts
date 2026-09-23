/**
 * registerOrganizationUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: register (create) a new Organization
 *
 * Delegates to IOrganizationsService via the DI container.
 * Contains no business logic — validation is the controller's responsibility.
 */

import {
  TOrgResponse,
  TRegisterOrg,
} from "@/modules/entities/schemas/organization";
import { getInjection } from "@/modules/server/di/container";

/**
 * Registers a new organization via the injected OrganizationService.
 *
 * @param dto - Validated registration payload (name, type[], active, optional fields).
 * @returns The newly created organization record.
 * @throws ValidationError | ConflictError | UnauthorizedError | BadGatewayError
 */
export async function registerOrganizationUseCase(
  dto: TRegisterOrg
): Promise<TOrgResponse> {
  const service = getInjection("IOrganizationsService");
  return service.register(dto);
}
