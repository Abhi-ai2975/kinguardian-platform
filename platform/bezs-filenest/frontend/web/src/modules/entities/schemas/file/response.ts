/**
 * entities/schemas/file/response — Zod response schemas for the file domain.
 *
 * Mirrors the backend FileResponse and FileListSchema Pydantic models.
 * No Next.js or React imports — safe in both browser and server contexts.
 *
 * @module
 */
import { z } from "zod";

export const FileStatusSchema = z.enum([
  "pending",
  "processing",
  "ready",
  "failed",
  "quarantined",
]);

export type TFileStatus = z.infer<typeof FileStatusSchema>;

export const FileSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  project_id: z.string(),
  filename: z.string(),
  content_type: z.string(),
  size_bytes: z.number(),
  status: FileStatusSchema,
  storage_key: z.string(),
  folder_id: z.string().nullable(),
  category: z.string().nullable(),
  version_count: z.number().int(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TFile = z.infer<typeof FileSchema>;

export const FileListSchema = z.object({
  items: z.array(FileSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  has_more: z.boolean(),
  next_cursor: z.string().nullable().optional(),
});

export type TFileList = z.infer<typeof FileListSchema>;

export const FileDownloadUrlSchema = z.object({
  url: z.string(),
  expires_at: z.string(),
});

export type TFileDownloadUrl = z.infer<typeof FileDownloadUrlSchema>;

export const TagsResponseSchema = z.object({
  id: z.string(),
  tags: z.array(z.string()),
});

export type TTagsResponse = z.infer<typeof TagsResponseSchema>;

export const MetadataResponseSchema = z.object({
  id: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export type TMetadataResponse = z.infer<typeof MetadataResponseSchema>;

// ── Upload responses ────────────────────────────────────────────────────────

export const UploadInitResponseSchema = z.object({
  file_id: z.string(),
  upload_url: z.string(),
  expires_at: z.string(),
});

export type TUploadInitResponse = z.infer<typeof UploadInitResponseSchema>;

export const ConfirmUploadResponseSchema = z.object({
  id: z.string(),
  status: FileStatusSchema,
});

export type TConfirmUploadResponse = z.infer<typeof ConfirmUploadResponseSchema>;

export const MultipartStartResponseSchema = z.object({
  upload_id: z.string(),
  file_id: z.string(),
});

export type TMultipartStartResponse = z.infer<typeof MultipartStartResponseSchema>;

export const PartUrlResponseSchema = z.object({
  upload_id: z.string(),
  part_number: z.number(),
  url: z.string(),
  expires_at: z.string(),
});

export type TPartUrlResponse = z.infer<typeof PartUrlResponseSchema>;

export const MultipartCompleteResponseSchema = z.object({
  file_id: z.string(),
  status: FileStatusSchema,
});

export type TMultipartCompleteResponse = z.infer<typeof MultipartCompleteResponseSchema>;

export const MultipartAbortResponseSchema = z.object({
  upload_id: z.string(),
  aborted: z.boolean(),
});

export type TMultipartAbortResponse = z.infer<typeof MultipartAbortResponseSchema>;
