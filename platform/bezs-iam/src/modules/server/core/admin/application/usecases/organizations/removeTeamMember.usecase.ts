import { getInjection } from "@/modules/server/di/container";
import { TRemoveTeamMemberValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function removeTeamMemberUseCase(
  payload: TRemoveTeamMemberValidationSchema,
): Promise<{ success: boolean }> {
  const repository = getInjection("IOrganizationsRepository");
  return repository.removeTeamMember(payload);
}
