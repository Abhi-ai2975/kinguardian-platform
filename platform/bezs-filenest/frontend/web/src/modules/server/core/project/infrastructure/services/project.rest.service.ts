/**
 * project.rest.service — REST implementation of IProjectService.
 *
 * Layer: core / project / infrastructure / services
 *
 * Calls the FileNest FastAPI backend via filenestApi. Validates every
 * response against the canonical Zod schemas before returning so schema
 * drift between backend and frontend is caught at the boundary.
 * HTTP errors thrown by filenestApi (ApiError) propagate up through the
 * use case and controller to runWithTransport → mapErrorToZSA.
 *
 * Bound in the DI container by registerProjectModule().
 *
 * @module
 */
"server-only";

import { filenestApi } from "@/modules/server/utils/api-client";
import {
  ProjectSchema,
  ProjectListSchema,
  type TProject,
  type TProjectList,
  type TCreateProject,
  type TUpdateProject,
  type TListProjectsParams,
} from "@/modules/entities/schemas/project";
import { OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import type { IProjectService } from "../../domain/interfaces/project.service.interface";

export class ProjectRestService implements IProjectService {
  async get(projectId: string): Promise<TProject> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}`);
    const parsed = ProjectSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async list(params?: TListProjectsParams): Promise<TProjectList> {
    const qs = params ? "?" + new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    ).toString() : "";
    const raw = await filenestApi<unknown>(`/v1/projects${qs}`);
    const parsed = ProjectListSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async create(dto: TCreateProject): Promise<TProject> {
    const raw = await filenestApi<unknown>("/v1/projects", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    const parsed = ProjectSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async update(projectId: string, dto: TUpdateProject): Promise<TProject> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
    const parsed = ProjectSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async delete(projectId: string): Promise<void> {
    await filenestApi<void>(`/v1/projects/${projectId}`, { method: "DELETE" });
  }
}
