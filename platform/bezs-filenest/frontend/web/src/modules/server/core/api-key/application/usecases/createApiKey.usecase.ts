/**
 * createApiKey.usecase — create a new API key in the IAM.
 *
 * Layer: core / api-key / application / usecases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TCreatedApiKey, TCreateApiKey } from "@/modules/entities/schemas/api-key";

/**
 * @param dto - Validated create payload.
 * @returns The newly created API key (includes full key string — shown once).
 */
export async function createApiKeyUseCase(dto: TCreateApiKey): Promise<TCreatedApiKey> {
  const service = getInjection("IApiKeyService");
  return service.create(dto);
}
