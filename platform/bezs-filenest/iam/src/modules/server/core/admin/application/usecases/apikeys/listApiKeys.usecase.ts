import { getInjection } from "@/modules/server/di/container";
import {
  TListApiKeysQuerySchema,
  TListApiKeysResponseSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

export async function listApiKeysUseCase(
  query: TListApiKeysQuerySchema,
): Promise<TListApiKeysResponseSchema> {
  return getInjection("IApiKeyService").listApiKeys(query);
}
