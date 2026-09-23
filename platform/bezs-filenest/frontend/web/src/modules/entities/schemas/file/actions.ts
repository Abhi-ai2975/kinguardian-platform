/**
 * entities/schemas/file/actions — ZSA action envelope schemas for files.
 *
 * Every action schema carries transportOptions so any action can trigger
 * revalidation or redirect after it completes.
 *
 * @module
 */
import { z } from "zod";
import { TransportOptionsSchema } from "../transport";
import {
  ListFilesParamsSchema,
  DeleteFileSchema,
  GetFileDownloadUrlSchema,
  SetTagsSchema,
  AddTagsSchema,
  UpdateMetadataSchema,
  MergeMetadataSchema,
} from "./input";

export const ListFilesActionSchema = z.object({
  payload: ListFilesParamsSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TListFilesAction = z.infer<typeof ListFilesActionSchema>;

export const DeleteFileActionSchema = z.object({
  payload: DeleteFileSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TDeleteFileAction = z.infer<typeof DeleteFileActionSchema>;

export const GetFileDownloadUrlActionSchema = z.object({
  payload: GetFileDownloadUrlSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TGetFileDownloadUrlAction = z.infer<typeof GetFileDownloadUrlActionSchema>;

export const SetTagsActionSchema = z.object({
  payload: SetTagsSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TSetTagsAction = z.infer<typeof SetTagsActionSchema>;

export const AddTagsActionSchema = z.object({
  payload: AddTagsSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAddTagsAction = z.infer<typeof AddTagsActionSchema>;

export const UpdateMetadataActionSchema = z.object({
  payload: UpdateMetadataSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateMetadataAction = z.infer<typeof UpdateMetadataActionSchema>;

export const MergeMetadataActionSchema = z.object({
  payload: MergeMetadataSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TMergeMetadataAction = z.infer<typeof MergeMetadataActionSchema>;

// ── Upload actions ───────────────────────────────────────────────────────────

import {
  InitiateUploadSchema,
  ConfirmUploadSchema,
  InitiateMultipartSchema,
  GetPartUrlSchema,
  CompleteMultipartSchema,
  AbortMultipartSchema,
  RenameFileSchema,
  MoveFileSchema,
} from "./input";

export const InitiateUploadActionSchema = z.object({
  payload: InitiateUploadSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TInitiateUploadAction = z.infer<typeof InitiateUploadActionSchema>;

export const ConfirmUploadActionSchema = z.object({
  payload: ConfirmUploadSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TConfirmUploadAction = z.infer<typeof ConfirmUploadActionSchema>;

export const InitiateMultipartActionSchema = z.object({
  payload: InitiateMultipartSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TInitiateMultipartAction = z.infer<typeof InitiateMultipartActionSchema>;

export const GetPartUrlActionSchema = z.object({
  payload: GetPartUrlSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TGetPartUrlAction = z.infer<typeof GetPartUrlActionSchema>;

export const CompleteMultipartActionSchema = z.object({
  payload: CompleteMultipartSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCompleteMultipartAction = z.infer<typeof CompleteMultipartActionSchema>;

export const AbortMultipartActionSchema = z.object({
  payload: AbortMultipartSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAbortMultipartAction = z.infer<typeof AbortMultipartActionSchema>;

export const RenameFileActionSchema = z.object({
  payload: RenameFileSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TRenameFileAction = z.infer<typeof RenameFileActionSchema>;

export const MoveFileActionSchema = z.object({
  payload: MoveFileSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TMoveFileAction = z.infer<typeof MoveFileActionSchema>;
