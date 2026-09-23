import { getInjection } from "@/modules/server/di/container";
import { TCancelInvitationValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function cancelInvitationUseCase(
  payload: TCancelInvitationValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IOrganizationsService");
  return service.cancelInvitation(payload);
}
