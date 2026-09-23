/**
 * updateSseStorageConfig.usecase — toggles server-side encryption for a project's storage.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TStorageConfig } from "@/modules/entities/schemas/storage-config";

export async function updateSseStorageConfigUseCase(
  projectId: string,
  sse_enabled: boolean,
): Promise<TStorageConfig> {
  return getInjection("IStorageConfigService").updateSse(projectId, sse_enabled);
}
