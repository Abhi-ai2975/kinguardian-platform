import { getInjection } from "@/modules/server/di/container";

export async function getOrgRoleRedirectsUseCase(
  userId: string,
  organizationId: string,
): Promise<Record<string, string>> {
  const service = getInjection("IOrganizationsService");
  return service.getOrgRoleRedirects(userId, organizationId);
}
