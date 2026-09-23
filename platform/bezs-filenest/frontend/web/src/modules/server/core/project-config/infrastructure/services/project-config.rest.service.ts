/**
 * project-config.rest.service — REST implementation of IProjectConfigService.
 *
 * Calls GET/PATCH /v1/projects/{id}/config/* on the FileNest FastAPI backend.
 * Every response is validated against the Zod ProjectConfigSchema so drift
 * between backend and frontend is caught at the boundary.
 *
 * @module
 */
"server-only";

import { filenestApi } from "@/modules/server/utils/api-client";
import {
  ProjectConfigSchema,
  type TProjectConfig,
  type TUpdateUploadConfig,
  type TUpdateSecurityConfig,
  type TUpdateProcessingConfig,
  type TUpdateComplianceConfig,
} from "@/modules/entities/schemas/project-config";
import { OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import type { IProjectConfigService } from "../../domain/interfaces/project-config.service.interface";

export class ProjectConfigRestService implements IProjectConfigService {
  async get(projectId: string): Promise<TProjectConfig> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/config`);
    const parsed = ProjectConfigSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async updateUpload(
    projectId: string,
    dto: Omit<TUpdateUploadConfig, "projectId">,
  ): Promise<TProjectConfig> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/config/upload`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
    const parsed = ProjectConfigSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async updateSecurity(
    projectId: string,
    dto: Omit<TUpdateSecurityConfig, "projectId">,
  ): Promise<TProjectConfig> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/config/security`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
    const parsed = ProjectConfigSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async updateProcessing(
    projectId: string,
    dto: Omit<TUpdateProcessingConfig, "projectId">,
  ): Promise<TProjectConfig> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/config/processing`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
    const parsed = ProjectConfigSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async updateCompliance(
    projectId: string,
    dto: Omit<TUpdateComplianceConfig, "projectId">,
  ): Promise<TProjectConfig> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/config/compliance`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
    const parsed = ProjectConfigSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }
}
