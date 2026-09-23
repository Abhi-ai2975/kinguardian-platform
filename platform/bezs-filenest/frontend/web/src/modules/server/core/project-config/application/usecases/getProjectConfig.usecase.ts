/**
 * getProjectConfig.usecase — fetches the full config for a project.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TProjectConfig } from "@/modules/entities/schemas/project-config";

export async function getProjectConfigUseCase(projectId: string): Promise<TProjectConfig> {
  return getInjection("IProjectConfigService").get(projectId);
}
