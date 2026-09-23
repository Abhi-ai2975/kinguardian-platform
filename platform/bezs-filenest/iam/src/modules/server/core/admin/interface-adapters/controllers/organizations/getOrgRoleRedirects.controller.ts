import { getOrgRoleRedirectsUseCase } from "../../../application/usecases/organizations/getOrgRoleRedirects.usecase";

function presenter(data: Record<string, string>) {
  return data;
}

export type TGetOrgRoleRedirectsControllerOutput = ReturnType<typeof presenter>;

export async function getOrgRoleRedirectsController(
  userId: string,
  organizationId: string,
): Promise<TGetOrgRoleRedirectsControllerOutput> {
  const data = await getOrgRoleRedirectsUseCase(userId, organizationId);
  return presenter(data);
}
