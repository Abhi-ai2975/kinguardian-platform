/**
 * entities/schemas/project-config/input — mutation schemas for the four config categories.
 *
 * All fields are optional (partial update semantics). Pass an empty array for
 * list fields to explicitly clear a restriction — the backend converts [] to null.
 *
 * @module
 */
import { z } from "zod";

export const UpdateUploadConfigSchema = z.object({
  projectId: z.string().min(1),
  max_file_size_bytes: z.number().int().positive().nullable().optional(),
  allowed_mime_types: z.array(z.string()).nullable().optional(),
  allowed_extensions: z.array(z.string()).nullable().optional(),
  max_files_per_request: z.number().int().positive().nullable().optional(),
});
export type TUpdateUploadConfig = z.infer<typeof UpdateUploadConfigSchema>;

export const UpdateSecurityConfigSchema = z.object({
  projectId: z.string().min(1),
  allowed_ips: z.array(z.string()).nullable().optional(),
  allowed_origins: z.array(z.string()).nullable().optional(),
  require_signed_urls: z.boolean().optional(),
  signed_url_ttl_seconds: z.number().int().min(60).max(86400).optional(),
});
export type TUpdateSecurityConfig = z.infer<typeof UpdateSecurityConfigSchema>;

export const UpdateProcessingConfigSchema = z.object({
  projectId: z.string().min(1),
  versioning_enabled: z.boolean().optional(),
  ocr_enabled: z.boolean().optional(),
  virus_scan_enabled: z.boolean().optional(),
});
export type TUpdateProcessingConfig = z.infer<typeof UpdateProcessingConfigSchema>;

export const UpdateComplianceConfigSchema = z.object({
  projectId: z.string().min(1),
  retention_days: z.number().int().positive().nullable().optional(),
  worm_enabled: z.boolean().optional(),
  legal_hold_enabled: z.boolean().optional(),
  data_residency: z.string().nullable().optional(),
});
export type TUpdateComplianceConfig = z.infer<typeof UpdateComplianceConfigSchema>;
