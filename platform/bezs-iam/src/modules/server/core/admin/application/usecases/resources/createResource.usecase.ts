import {
  TCreateResourceValidationSchema,
  TResourceSchema,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import { getInjection } from "@/modules/server/di/container";

export async function createResourceUseCase(
  payload: TCreateResourceValidationSchema,
): Promise<TResourceSchema> {
  const repository = getInjection("IResourcesRepository");
  return await repository.createResource(payload);
}
