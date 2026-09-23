import { getInjection } from "@/modules/server/di/container";

export async function getOrgRoleRedirectsUseCase(
  userId: string,
  organizationId: string,
): Promise<Record<string, string>> {
  const repository = getInjection("IOrganizationsRepository");
  return repository.getOrgRoleRedirects(userId, organizationId);
}
