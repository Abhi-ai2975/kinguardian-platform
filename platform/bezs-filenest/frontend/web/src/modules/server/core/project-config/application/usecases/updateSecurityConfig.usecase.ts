/**
 * updateSecurityConfig.usecase — updates network security settings for a project.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TProjectConfig, TUpdateSecurityConfig } from "@/modules/entities/schemas/project-config";

export async function updateSecurityConfigUseCase(
  dto: TUpdateSecurityConfig,
): Promise<TProjectConfig> {
  const { projectId, ...rest } = dto;
  return getInjection("IProjectConfigService").updateSecurity(projectId, rest);
}
