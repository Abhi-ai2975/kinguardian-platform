/**
 * entities/schemas/file/input — validation schemas for file operations.
 *
 * Used by controllers (server-side Zod validation) and the client
 * for typed payloads. No Next.js or React imports here.
 *
 * @module
 */
import { z } from "zod";

export const ListFilesParamsSchema = z.object({
  projectId: z.string().min(1),
  // ── Filters ──────────────────────────────────────────────────────────────
  folder_id: z.string().optional(),
  q: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  size_min: z.number().int().min(0).optional(),
  size_max: z.number().int().min(0).optional(),
  /** JSON object string for JSONB metadata containment, e.g. '{"patientId":"P-001"}' */
  metadata: z.string().optional(),
  // ── Pagination ────────────────────────────────────────────────────────────
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
  cursor: z.string().optional(),
});

export type TListFilesParams = z.infer<typeof ListFilesParamsSchema>;

export const SetTagsSchema = z.object({
  projectId: z.string().min(1),
  fileId: z.string().min(1),
  tags: z.array(z.string()),
});
export type TSetTags = z.infer<typeof SetTagsSchema>;

export const AddTagsSchema = z.object({
  projectId: z.string().min(1),
  fileId: z.string().min(1),
  tags: z.array(z.string()),
});
export type TAddTags = z.infer<typeof AddTagsSchema>;

export const UpdateMetadataSchema = z.object({
  projectId: z.string().min(1),
  fileId: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
});
export type TUpdateMetadata = z.infer<typeof UpdateMetadataSchema>;

export const MergeMetadataSchema = z.object({
  projectId: z.string().min(1),
  fileId: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
});
export type TMergeMetadata = z.infer<typeof MergeMetadataSchema>;

export const DeleteFileSchema = z.object({
  projectId: z.string().min(1),
  fileId: z.string().min(1),
});

export type TDeleteFile = z.infer<typeof DeleteFileSchema>;

export const GetFileDownloadUrlSchema = z.object({
  projectId: z.string().min(1),
  fileId: z.string().min(1),
  ttl: z.number().int().min(60).max(86400).optional(),
});

export type TGetFileDownloadUrl = z.infer<typeof GetFileDownloadUrlSchema>;

// ── Upload — single-file presigned URL flow ─────────────────────────────────

export const InitiateUploadSchema = z.object({
  projectId: z.string().min(1),
  filename: z.string().min(1),
  content_type: z.string().min(1),
  size_bytes: z.number().int().positive(),
  folder_id: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type TInitiateUpload = z.infer<typeof InitiateUploadSchema>;

export const ConfirmUploadSchema = z.object({
  projectId: z.string().min(1),
  fileId: z.string().min(1),
});

export type TConfirmUpload = z.infer<typeof ConfirmUploadSchema>;

// ── Upload — multipart flow ────────────────────────────────────────────────

export const InitiateMultipartSchema = z.object({
  projectId: z.string().min(1),
  filename: z.string().min(1),
  content_type: z.string().min(1),
  total_size_bytes: z.number().int().positive(),
  folder_id: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type TInitiateMultipart = z.infer<typeof InitiateMultipartSchema>;

export const GetPartUrlSchema = z.object({
  projectId: z.string().min(1),
  uploadId: z.string().min(1),
  part: z.number().int().min(1),
});

export type TGetPartUrl = z.infer<typeof GetPartUrlSchema>;

export const CompleteMultipartSchema = z.object({
  projectId: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z.array(
    z.object({
      part_number: z.number().int().min(1),
      etag: z.string().min(1),
    }),
  ),
});

export type TCompleteMultipart = z.infer<typeof CompleteMultipartSchema>;

export const AbortMultipartSchema = z.object({
  projectId: z.string().min(1),
  uploadId: z.string().min(1),
});

export type TAbortMultipart = z.infer<typeof AbortMultipartSchema>;

export const RenameFileSchema = z.object({
  projectId: z.string().min(1),
  fileId: z.string().min(1),
  filename: z.string().min(1),
});

export type TRenameFile = z.infer<typeof RenameFileSchema>;

export const MoveFileSchema = z.object({
  projectId: z.string().min(1),
  fileId: z.string().min(1),
  folder_id: z.string().nullable(),
});

export type TMoveFile = z.infer<typeof MoveFileSchema>;
