import { getInjection } from "@/modules/server/di/container";
import { TRemoveTeamValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function removeTeamUseCase(payload: TRemoveTeamValidationSchema): Promise<{ success: boolean }> {
  const service = getInjection("IOrganizationsService");
  return service.removeTeam(payload);
}
