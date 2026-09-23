import { getInjection } from "@/modules/server/di/container";
import {
  TOrgRoleSchema,
  TCreateOrgRoleValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function createOrgRoleUseCase(
  payload: TCreateOrgRoleValidationSchema,
): Promise<TOrgRoleSchema> {
  const repository = getInjection("IOrganizationsRepository");
  return repository.createOrgRole(payload);
}
