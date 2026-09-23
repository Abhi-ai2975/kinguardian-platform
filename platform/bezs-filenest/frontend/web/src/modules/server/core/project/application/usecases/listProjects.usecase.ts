/**
 * listProjects.usecase — application layer use case.
 *
 * Layer: core / project / application / usecases
 * Operation: list all projects in the caller's organisation
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TProjectList, TListProjectsParams } from "@/modules/entities/schemas/project";

/**
 * Returns a page of projects for the caller's organisation.
 *
 * @param params - Optional pagination/sort/filter params.
 * @returns Paginated project list.
 * @throws ApiError propagated from the service.
 */
export async function listProjectsUseCase(params?: TListProjectsParams): Promise<TProjectList> {
  const service = getInjection("IProjectService");
  return service.list(params);
}
