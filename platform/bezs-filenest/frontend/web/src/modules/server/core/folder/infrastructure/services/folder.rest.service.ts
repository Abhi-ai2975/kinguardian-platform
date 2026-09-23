/**
 * folder.rest.service — REST implementation of IFolderService.
 *
 * @module
 */
"server-only";

import { filenestApi } from "@/modules/server/utils/api-client";
import {
  FolderSchema,
  FolderListSchema,
  FolderDeleteResponseSchema,
  type TFolder,
  type TFolderList,
  type TFolderDeleteResponse,
  type TCreateFolderParams,
} from "@/modules/entities/schemas/folder";
import { OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import type { IFolderService } from "../../domain/interfaces/folder.service.interface";

export class FolderRestService implements IFolderService {
  async list(projectId: string): Promise<TFolderList> {
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/folders`);
    const parsed = FolderListSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async create(params: TCreateFolderParams): Promise<TFolder> {
    const { projectId, ...body } = params;
    const raw = await filenestApi<unknown>(`/v1/projects/${projectId}/folders`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const parsed = FolderSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async delete(projectId: string, folderId: string): Promise<TFolderDeleteResponse> {
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/folders/${folderId}`,
      { method: "DELETE" },
    );
    const parsed = FolderDeleteResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }
}
