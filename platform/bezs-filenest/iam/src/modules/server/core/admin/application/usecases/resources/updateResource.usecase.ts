import {
  TUpdateResourceValidationSchema,
  TResourceSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function updateResourceUseCase(
  payload: TUpdateResourceValidationSchema,
): Promise<TResourceSchema> {
  const service = getInjection("IResourcesService");
  return await service.updateResource(payload);
}
