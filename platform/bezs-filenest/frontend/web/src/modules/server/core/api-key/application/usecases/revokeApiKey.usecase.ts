/**
 * revokeApiKey.usecase — revoke (delete) an API key in the IAM.
 *
 * Layer: core / api-key / application / usecases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TRevokeApiKey } from "@/modules/entities/schemas/api-key";

/**
 * @param params - keyId of the API key to revoke.
 */
export async function revokeApiKeyUseCase(params: TRevokeApiKey): Promise<void> {
  const service = getInjection("IApiKeyService");
  return service.revoke(params);
}
