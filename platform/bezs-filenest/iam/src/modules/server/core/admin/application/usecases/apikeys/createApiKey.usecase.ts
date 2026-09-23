import { getInjection } from "@/modules/server/di/container";
import {
  TCreateApiKeyValidationSchema,
  TApiKeyCreatedSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

export async function createApiKeyUseCase(
  payload: TCreateApiKeyValidationSchema,
): Promise<TApiKeyCreatedSchema> {
  return getInjection("IApiKeyService").createApiKey(payload);
}
