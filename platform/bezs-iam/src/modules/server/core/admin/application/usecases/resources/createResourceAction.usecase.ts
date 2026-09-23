import {
  TCreateResourceActionValidationSchema,
  TResourceActionSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function createResourceActionUseCase(
  payload: TCreateResourceActionValidationSchema,
): Promise<TResourceActionSchema> {
  const repository = getInjection("IResourcesRepository");
  return await repository.createResourceAction(payload);
}
