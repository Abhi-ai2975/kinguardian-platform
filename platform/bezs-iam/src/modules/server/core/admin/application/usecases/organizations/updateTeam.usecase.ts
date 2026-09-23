import { getInjection } from "@/modules/server/di/container";
import { TUpdateTeamValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function updateTeamUseCase(payload: TUpdateTeamValidationSchema): Promise<{ success: boolean }> {
  const service = getInjection("IOrganizationsService");
  return service.updateTeam(payload);
}
