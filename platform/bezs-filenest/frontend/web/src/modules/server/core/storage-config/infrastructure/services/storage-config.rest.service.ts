/**
 * storage-config.rest.service — REST implementation of IStorageConfigService.
 *
 * Calls the FileNest FastAPI backend via filenestApi. Validates every response
 * against Zod schemas so schema drift between backend and frontend is caught at
 * the boundary. Bound in the DI container by registerStorageConfigModule().
 *
 * @module
 */
"server-only";

import { filenestApi } from "@/modules/server/utils/api-client";
import {
  StorageConfigSchema,
  StorageVerifyResultSchema,
  type TStorageConfig,
  type TStorageVerifyResult,
  type TUpdateStorageConfig,
} from "@/modules/entities/schemas/storage-config";
import { OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import type { IStorageConfigService } from "../../domain/interfaces/storage-config.service.interface";

export class StorageConfigRestService implements IStorageConfigService {
  async get(projectId: string): Promise<TStorageConfig> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/storage`);
    const parsed = StorageConfigSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async update(
    projectId: string,
    dto: Omit<TUpdateStorageConfig, "projectId">,
  ): Promise<TStorageConfig> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/storage`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
    const parsed = StorageConfigSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async verify(projectId: string): Promise<TStorageVerifyResult> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/storage/verify`, {
      method: "POST",
    });
    const parsed = StorageVerifyResultSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async updateSse(projectId: string, sse_enabled: boolean): Promise<TStorageConfig> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/storage/sse`, {
      method: "PATCH",
      body: JSON.stringify({ sse_enabled }),
    });
    const parsed = StorageConfigSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }
}
