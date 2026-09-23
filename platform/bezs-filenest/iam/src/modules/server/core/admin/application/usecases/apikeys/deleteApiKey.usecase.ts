import { getInjection } from "@/modules/server/di/container";
import { TDeleteApiKeyValidationSchema } from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

export async function deleteApiKeyUseCase(
  payload: TDeleteApiKeyValidationSchema,
): Promise<{ success: boolean }> {
  return getInjection("IApiKeyService").deleteApiKey(payload);
}
