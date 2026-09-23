/**
 * getProject.usecase — fetch a single project by ID.
 *
 * Layer: core / project / application / usecases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TProject } from "@/modules/entities/schemas/project";

/**
 * Returns a single project by ID.
 *
 * @param projectId - The project to retrieve.
 * @returns The project record.
 * @throws ApiError propagated from the service.
 */
export async function getProjectUseCase(projectId: string): Promise<TProject> {
  const service = getInjection("IProjectService");
  return service.get(projectId);
}
