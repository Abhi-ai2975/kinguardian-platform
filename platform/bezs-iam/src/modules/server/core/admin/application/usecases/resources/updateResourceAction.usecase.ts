import {
  TUpdateResourceActionValidationSchema,
  TResourceActionSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function updateResourceActionUseCase(
  payload: TUpdateResourceActionValidationSchema,
): Promise<TResourceActionSchema> {
  const repository = getInjection("IResourcesRepository");
  return await repository.updateResourceAction(payload);
}
