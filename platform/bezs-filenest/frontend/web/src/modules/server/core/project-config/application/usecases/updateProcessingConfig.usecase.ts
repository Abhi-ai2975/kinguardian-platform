/**
 * updateProcessingConfig.usecase — updates processing feature flags for a project.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TProjectConfig, TUpdateProcessingConfig } from "@/modules/entities/schemas/project-config";

export async function updateProcessingConfigUseCase(
  dto: TUpdateProcessingConfig,
): Promise<TProjectConfig> {
  const { projectId, ...rest } = dto;
  return getInjection("IProjectConfigService").updateProcessing(projectId, rest);
}
