/**
 * updateComplianceConfig.usecase — updates compliance settings for a project.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TProjectConfig, TUpdateComplianceConfig } from "@/modules/entities/schemas/project-config";

export async function updateComplianceConfigUseCase(
  dto: TUpdateComplianceConfig,
): Promise<TProjectConfig> {
  const { projectId, ...rest } = dto;
  return getInjection("IProjectConfigService").updateCompliance(projectId, rest);
}
