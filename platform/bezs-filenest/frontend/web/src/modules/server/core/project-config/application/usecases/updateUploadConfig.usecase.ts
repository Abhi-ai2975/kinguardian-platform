/**
 * updateUploadConfig.usecase — updates upload restriction settings for a project.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TProjectConfig, TUpdateUploadConfig } from "@/modules/entities/schemas/project-config";

export async function updateUploadConfigUseCase(
  dto: TUpdateUploadConfig,
): Promise<TProjectConfig> {
  const { projectId, ...rest } = dto;
  return getInjection("IProjectConfigService").updateUpload(projectId, rest);
}
