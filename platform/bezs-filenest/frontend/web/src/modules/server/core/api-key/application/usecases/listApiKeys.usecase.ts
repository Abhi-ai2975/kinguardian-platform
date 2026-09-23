/**
 * listApiKeys.usecase — list API keys for an organisation and project.
 *
 * Layer: core / api-key / application / usecases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TApiKeyList, TListApiKeys } from "@/modules/entities/schemas/api-key";

/**
 * @param params - organizationId + optional projectId filter.
 * @returns List of API keys.
 */
export async function listApiKeysUseCase(params: TListApiKeys): Promise<TApiKeyList> {
  const service = getInjection("IApiKeyService");
  return service.list(params);
}
