/**
 * deleteProject.usecase — application layer use case.
 *
 * Layer: core / project / application / usecases
 * Operation: soft-delete a project
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";

/**
 * Soft-deletes a project. Files and storage config are retained on the backend.
 *
 * @param projectId - Target project ID.
 * @throws ApiError propagated from the service.
 */
export async function deleteProjectUseCase(projectId: string): Promise<void> {
  const service = getInjection("IProjectService");
  return service.delete(projectId);
}
