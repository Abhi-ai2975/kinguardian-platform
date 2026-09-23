import { TListResourceActionsResponseSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function listResourceActionsUseCase(
  resourceId?: string,
): Promise<TListResourceActionsResponseSchema> {
  const service = getInjection("IResourcesService");
  return await service.listResourceActions(resourceId);
}
