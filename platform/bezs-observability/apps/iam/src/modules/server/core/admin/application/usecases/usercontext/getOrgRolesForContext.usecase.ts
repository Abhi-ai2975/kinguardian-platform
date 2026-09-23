import { getInjection } from "@/modules/server/di/container";
import { TGetOrgRolesForContextResponseSchema } from "@/modules/entities/schemas/admin/user-context/user-context.schema";

export async function getOrgRolesForContextUseCase(
  organizationId: string,
): Promise<TGetOrgRolesForContextResponseSchema> {
  const service = getInjection("IUserContextService");
  return service.getOrgRolesForContext(organizationId);
}
