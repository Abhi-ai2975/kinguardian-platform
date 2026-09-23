import { getInjection } from "@/modules/server/di/container";
import {
  TOrgRoleSchema,
  TCreateOrgRoleValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function createOrgRoleUseCase(
  payload: TCreateOrgRoleValidationSchema,
): Promise<TOrgRoleSchema> {
  const service = getInjection("IOrganizationsService");
  return service.createOrgRole(payload);
}
