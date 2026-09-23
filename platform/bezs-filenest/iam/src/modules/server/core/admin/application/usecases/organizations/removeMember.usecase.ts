import { getInjection } from "@/modules/server/di/container";
import { TRemoveMemberValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function removeMemberUseCase(payload: TRemoveMemberValidationSchema): Promise<{ success: boolean }> {
  const service = getInjection("IOrganizationsService");
  return service.removeMember(payload);
}
