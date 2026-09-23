/**
 * createProject.usecase — application layer use case.
 *
 * Layer: core / project / application / usecases
 * Operation: create a new project (storage config auto-provisioned by backend)
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TCreateProject, TProject } from "@/modules/entities/schemas/project";

/**
 * Creates a new project in the caller's organisation.
 *
 * @param dto - Validated create payload.
 * @returns The newly created project record.
 * @throws ApiError propagated from the service.
 */
export async function createProjectUseCase(dto: TCreateProject): Promise<TProject> {
  const service = getInjection("IProjectService");
  return service.create(dto);
}
