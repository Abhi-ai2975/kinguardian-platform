import { TDeleteResourceActionValidationSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function deleteResourceActionUseCase(
  payload: TDeleteResourceActionValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IResourcesService");
  return await service.deleteResourceAction(payload);
}
