import { TDeleteResourceActionValidationSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function deleteResourceActionUseCase(
  payload: TDeleteResourceActionValidationSchema,
): Promise<{ success: boolean }> {
  const repository = getInjection("IResourcesRepository");
  return await repository.deleteResourceAction(payload);
}
