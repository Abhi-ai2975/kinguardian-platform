import { getInjection } from "@/modules/server/di/container";
import { TAddMemberValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function addMemberUseCase(payload: TAddMemberValidationSchema): Promise<{ success: boolean }> {
  const usersService = getInjection("IUsersService");
  const orgsService = getInjection("IOrganizationsService");

  const user = await usersService.getUserByEmail(payload.email);

  return orgsService.addMember({
    organizationId: payload.organizationId,
    userId: user.id,
    roles: payload.roles,
  });
}
