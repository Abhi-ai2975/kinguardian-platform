/**
 * entities/schemas/folder/actions — ZSA action envelope schemas for folders.
 *
 * @module
 */
import { z } from "zod";
import { TransportOptionsSchema } from "../transport";
import {
  ListFoldersParamsSchema,
  CreateFolderParamsSchema,
  DeleteFolderParamsSchema,
} from "./input";

export const ListFoldersActionSchema = z.object({
  payload: ListFoldersParamsSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TListFoldersAction = z.infer<typeof ListFoldersActionSchema>;

export const CreateFolderActionSchema = z.object({
  payload: CreateFolderParamsSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TCreateFolderAction = z.infer<typeof CreateFolderActionSchema>;

export const DeleteFolderActionSchema = z.object({
  payload: DeleteFolderParamsSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TDeleteFolderAction = z.infer<typeof DeleteFolderActionSchema>;
