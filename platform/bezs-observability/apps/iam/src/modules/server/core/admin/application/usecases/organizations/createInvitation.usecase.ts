import { getInjection } from "@/modules/server/di/container";
import { TCreateInvitationValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function createInvitationUseCase(
  payload: TCreateInvitationValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IOrganizationsService");
  return service.createInvitation(payload);
}
