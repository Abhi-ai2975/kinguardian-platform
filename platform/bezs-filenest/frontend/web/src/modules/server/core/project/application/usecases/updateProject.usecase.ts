/**
 * updateProject.usecase — application layer use case.
 *
 * Layer: core / project / application / usecases
 * Operation: patch mutable project fields
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TUpdateProject, TProject } from "@/modules/entities/schemas/project";

/**
 * Partially updates a project's mutable fields.
 *
 * @param projectId - Target project ID.
 * @param dto       - Validated patch payload.
 * @returns The updated project record.
 * @throws ApiError propagated from the service.
 */
export async function updateProjectUseCase(
  projectId: string,
  dto: TUpdateProject,
): Promise<TProject> {
  const service = getInjection("IProjectService");
  return service.update(projectId, dto);
}
