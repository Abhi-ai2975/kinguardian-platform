import { getInjection } from "@/modules/server/di/container";
import { TAddTeamMemberValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function addTeamMemberUseCase(payload: TAddTeamMemberValidationSchema): Promise<{ success: boolean }> {
  const usersService = getInjection("IUsersService");
  const orgsService = getInjection("IOrganizationsService");

  const user = await usersService.getUserByEmail(payload.email);

  const isMember = await orgsService.isMemberInOrg(payload.organizationId, user.id);
  if (!isMember) {
    throw new Error(`${payload.email} is not a member of this organization. Add them to the organization first.`);
  }

  return orgsService.addTeamMember({
    teamId: payload.teamId,
    userId: user.id,
    organizationId: payload.organizationId,
  });
}
