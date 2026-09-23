import { getInjection } from "@/modules/server/di/container";
import { TCreateTeamValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function createTeamUseCase(payload: TCreateTeamValidationSchema): Promise<{ success: boolean }> {
  const service = getInjection("IOrganizationsService");
  return service.createTeam(payload);
}
