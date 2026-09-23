import { getInjection } from "@/modules/server/di/container";
import { TListMenuNodesResponseSchema } from "@/modules/entities/schemas/admin/apps/apps.schema";

export async function listMenuNodesUseCase(appId: string): Promise<TListMenuNodesResponseSchema> {
  const repository = getInjection("IAppsRepository");
  return await repository.listMenuNodes(appId);
}
