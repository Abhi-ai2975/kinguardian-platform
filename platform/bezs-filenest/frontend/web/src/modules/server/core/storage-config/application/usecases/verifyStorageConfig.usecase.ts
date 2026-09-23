/**
 * verifyStorageConfig.usecase — probes a project's storage provider connectivity.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TStorageVerifyResult } from "@/modules/entities/schemas/storage-config";

export async function verifyStorageConfigUseCase(
  projectId: string,
): Promise<TStorageVerifyResult> {
  return getInjection("IStorageConfigService").verify(projectId);
}
