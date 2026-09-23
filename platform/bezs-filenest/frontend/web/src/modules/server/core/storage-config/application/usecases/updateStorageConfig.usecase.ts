/**
 * updateStorageConfig.usecase — saves BYOB credentials to a project's storage config.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type {
  TStorageConfig,
  TUpdateStorageConfig,
} from "@/modules/entities/schemas/storage-config";

export async function updateStorageConfigUseCase(
  dto: TUpdateStorageConfig,
): Promise<TStorageConfig> {
  const { projectId, ...rest } = dto;
  return getInjection("IStorageConfigService").update(projectId, rest);
}
