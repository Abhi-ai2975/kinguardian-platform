import { getInjection } from "@/modules/server/di/container";
import {
  TUpdateApiKeyValidationSchema,
  TApiKeySchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

export async function updateApiKeyUseCase(
  payload: TUpdateApiKeyValidationSchema,
): Promise<TApiKeySchema> {
  return getInjection("IApiKeyService").updateApiKey(payload);
}
