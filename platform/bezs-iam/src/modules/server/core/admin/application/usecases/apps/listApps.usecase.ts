import { getInjection } from "@/modules/server/di/container";
import { TListAppsResponseSchema } from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function listAppsUseCase(): Promise<TListAppsResponseSchema> {
  const repository = getInjection("IAppsRepository");
  return await repository.listApps();
}
