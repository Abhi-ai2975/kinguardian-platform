import { TListResourcesResponseSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function listResourcesUseCase(): Promise<TListResourcesResponseSchema> {
  const repository = getInjection("IResourcesRepository");
  return await repository.listResources();
}
