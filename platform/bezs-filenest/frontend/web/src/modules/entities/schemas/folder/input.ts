/**
 * entities/schemas/folder/input — validation schemas for folder operations.
 *
 * @module
 */
import { z } from "zod";

export const ListFoldersParamsSchema = z.object({
  projectId: z.string().min(1),
});

export type TListFoldersParams = z.infer<typeof ListFoldersParamsSchema>;

export const CreateFolderParamsSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
  parent_folder_id: z.string().nullable().optional(),
});

export type TCreateFolderParams = z.infer<typeof CreateFolderParamsSchema>;

export const DeleteFolderParamsSchema = z.object({
  projectId: z.string().min(1),
  folderId: z.string().min(1),
});

export type TDeleteFolderParams = z.infer<typeof DeleteFolderParamsSchema>;
