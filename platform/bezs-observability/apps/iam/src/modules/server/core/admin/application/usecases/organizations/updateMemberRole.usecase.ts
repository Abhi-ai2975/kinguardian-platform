import { getInjection } from "@/modules/server/di/container";
import { TUpdateMemberRoleValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function updateMemberRoleUseCase(
  payload: TUpdateMemberRoleValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IOrganizationsService");
  return service.updateMemberRole(payload);
}
