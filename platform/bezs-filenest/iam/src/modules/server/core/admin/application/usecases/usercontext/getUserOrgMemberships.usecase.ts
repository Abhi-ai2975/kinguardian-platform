import { getInjection } from "@/modules/server/di/container";
import { TGetUserOrgMembershipsResponseSchema } from "@/modules/entities/schemas/admin/user-context/user-context.schema";

export async function getUserOrgMembershipsUseCase(
  userId: string,
): Promise<TGetUserOrgMembershipsResponseSchema> {
  const service = getInjection("IUserContextService");
  return service.getUserOrgMemberships(userId);
}
