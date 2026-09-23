import { TDeleteResourceValidationSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function deleteResourceUseCase(
  payload: TDeleteResourceValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IResourcesService");
  return await service.deleteResource(payload);
}
