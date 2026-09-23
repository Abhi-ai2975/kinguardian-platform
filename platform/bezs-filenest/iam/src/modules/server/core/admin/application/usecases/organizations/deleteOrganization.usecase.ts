import { getInjection } from "@/modules/server/di/container";
import { TDeleteOrganizationValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function deleteOrganizationUseCase(
  payload: TDeleteOrganizationValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IOrganizationsService");
  return service.deleteOrganization(payload);
}
