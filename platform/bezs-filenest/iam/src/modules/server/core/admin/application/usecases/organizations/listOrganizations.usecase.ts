import { getInjection } from "@/modules/server/di/container";
import { TListOrganizationsResponseSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";

export async function listOrganizationsUseCase(): Promise<TListOrganizationsResponseSchema> {
  const service = getInjection("IOrganizationsService");
  return service.listOrganizations();
}
