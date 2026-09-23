import { getInjection } from "@/modules/server/di/container";
import { TListAppsResponseSchema } from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function listAppsUseCase(): Promise<TListAppsResponseSchema> {
  const service = getInjection("IAppsService");
  return await service.listApps();
}
