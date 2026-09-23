import { getInjection } from "@/modules/server/di/container";
import { TDeleteExpiredApiKeysValidationSchema } from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

export async function deleteExpiredApiKeysUseCase(
  payload: TDeleteExpiredApiKeysValidationSchema,
): Promise<{ success: boolean }> {
  return getInjection("IApiKeyService").deleteExpiredApiKeys(payload);
}
