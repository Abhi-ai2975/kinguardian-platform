/**
 * getStorageConfig.usecase — fetches storage config for a project.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TStorageConfig } from "@/modules/entities/schemas/storage-config";

export async function getStorageConfigUseCase(projectId: string): Promise<TStorageConfig> {
  return getInjection("IStorageConfigService").get(projectId);
}
