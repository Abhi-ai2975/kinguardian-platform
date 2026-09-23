import { TDeleteResourceValidationSchema } from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function deleteResourceUseCase(
  payload: TDeleteResourceValidationSchema,
): Promise<{ success: boolean }> {
  const repository = getInjection("IResourcesRepository");
  return await repository.deleteResource(payload);
}
