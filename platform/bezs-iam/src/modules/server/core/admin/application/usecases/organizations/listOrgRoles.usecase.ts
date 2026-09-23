import { getInjection } from "@/modules/server/di/container";
import { TListOrgRolesResponseSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function listOrgRolesUseCase(organizationId: string): Promise<TListOrgRolesResponseSchema> {
  const repository = getInjection("IOrganizationsRepository");
  return repository.listOrgRoles(organizationId);
}
