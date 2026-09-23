import { getInjection } from "@/modules/server/di/container";
import { TDeleteOrgRoleValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function deleteOrgRoleUseCase(
  payload: TDeleteOrgRoleValidationSchema,
): Promise<{ success: boolean }> {
  const repository = getInjection("IOrganizationsRepository");
  return repository.deleteOrgRole(payload);
}
