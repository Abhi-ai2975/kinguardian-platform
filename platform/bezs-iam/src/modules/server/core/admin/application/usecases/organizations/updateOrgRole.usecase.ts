import { getInjection } from "@/modules/server/di/container";
import {
  TOrgRoleSchema,
  TUpdateOrgRoleValidationSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function updateOrgRoleUseCase(
  payload: TUpdateOrgRoleValidationSchema,
): Promise<TOrgRoleSchema> {
  const repository = getInjection("IOrganizationsRepository");
  return repository.updateOrgRole(payload);
}
