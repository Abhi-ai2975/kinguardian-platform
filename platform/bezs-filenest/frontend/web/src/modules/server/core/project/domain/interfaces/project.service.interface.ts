/**
 * project.service.interface — domain contract for project API access.
 *
 * Layer: core / project / domain / interfaces
 *
 * Use cases depend on this interface, not the concrete REST implementation.
 * Swap the implementation (e.g. a mock for tests) by re-binding in the DI
 * module without touching any use case or controller.
 *
 * @module
 */
import type {
  TProject,
  TProjectList,
  TCreateProject,
  TUpdateProject,
  TListProjectsParams,
} from "@/modules/entities/schemas/project";

export interface IProjectService {
  /**
   * Returns a single project by ID.
   * @param projectId - Target project ID.
   * @throws ApiError on backend failure.
   */
  get(projectId: string): Promise<TProject>;

  /**
   * Returns a page of projects matching the given params.
   * @param params - Pagination, sort, filter params forwarded to the backend.
   * @throws ApiError on backend failure.
   */
  list(params?: TListProjectsParams): Promise<TProjectList>;

  /**
   * Creates a new project and auto-provisions its storage config.
   * @param dto - Validated create payload.
   * @throws ApiError on backend failure.
   */
  create(dto: TCreateProject): Promise<TProject>;

  /**
   * Partially updates mutable project fields (name, description, feature flags).
   * @param projectId - Target project ID.
   * @param dto       - Validated patch payload.
   * @throws ApiError on backend failure.
   */
  update(projectId: string, dto: TUpdateProject): Promise<TProject>;

  /**
   * Soft-deletes a project. Files and storage config are retained.
   * @param projectId - Target project ID.
   * @throws ApiError on backend failure.
   */
  delete(projectId: string): Promise<void>;
}
