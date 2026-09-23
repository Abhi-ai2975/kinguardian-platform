import {
  TCreateResourceValidationSchema,
  TResourceSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function createResourceUseCase(
  payload: TCreateResourceValidationSchema,
): Promise<TResourceSchema> {
  const service = getInjection("IResourcesService");
  return await service.createResource(payload);
}
