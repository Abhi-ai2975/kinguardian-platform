/**
 * entities/schemas/folder/response — Zod response schemas for the folder domain.
 *
 * Mirrors the backend FolderResponse and FolderListResponse Pydantic models.
 *
 * @module
 */
import { z } from "zod";

export const FolderSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  project_id: z.string(),
  parent_folder_id: z.string().nullable(),
  name: z.string(),
  path: z.string(),
  created_at: z.string(),
});

export type TFolder = z.infer<typeof FolderSchema>;

export const FolderListSchema = z.object({
  items: z.array(FolderSchema),
  total: z.number().int(),
});

export type TFolderList = z.infer<typeof FolderListSchema>;

export const FolderDeleteResponseSchema = z.object({
  id: z.string(),
  deleted: z.boolean(),
});

export type TFolderDeleteResponse = z.infer<typeof FolderDeleteResponseSchema>;
