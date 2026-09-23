import { getInjection } from "@/modules/server/di/container";
import { TListActionsResponseSchema } from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function listActionsUseCase(): Promise<TListActionsResponseSchema> {
  const service = getInjection("IAppsService");
  return await service.listActions();
}
