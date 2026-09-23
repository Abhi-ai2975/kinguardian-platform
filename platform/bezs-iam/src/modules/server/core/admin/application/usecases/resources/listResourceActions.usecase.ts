import { TListResourceActionsResponseSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function listResourceActionsUseCase(
  resourceId?: string,
): Promise<TListResourceActionsResponseSchema> {
  const repository = getInjection("IResourcesRepository");
  return await repository.listResourceActions(resourceId);
}
