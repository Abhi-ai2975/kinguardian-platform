import { getInjection } from "@/modules/server/di/container";
import { TOrganizationDetailSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function getOrganizationUseCase(organizationId: string): Promise<TOrganizationDetailSchema> {
  const repository = getInjection("IOrganizationsRepository");
  return repository.getOrganization(organizationId);
}
