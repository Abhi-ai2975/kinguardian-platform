/**
 * entities/schemas/project-config/forms — React Hook Form schemas for the four config forms.
 *
 * These differ from the input schemas in that they work with string values
 * for tag inputs (comma-joined in the form, split before submission).
 *
 * @module
 */
import { z } from "zod";

export const UploadConfigFormSchema = z.object({
  max_file_size_bytes: z.number().int().positive().nullable(),
  // Tags stored as arrays in form state; joined before API call.
  allowed_mime_types: z.array(z.string()),
  allowed_extensions: z.array(z.string()),
  max_files_per_request: z.number().int().positive().nullable(),
});
export type TUploadConfigForm = z.infer<typeof UploadConfigFormSchema>;

export const SecurityConfigFormSchema = z.object({
  allowed_ips: z.array(z.string()),
  allowed_origins: z.array(z.string()),
  require_signed_urls: z.boolean(),
  signed_url_ttl_seconds: z.number().int().min(60).max(86400),
});
export type TSecurityConfigForm = z.infer<typeof SecurityConfigFormSchema>;

export const ProcessingConfigFormSchema = z.object({
  versioning_enabled: z.boolean(),
  virus_scan_enabled: z.boolean(),
  // ocr_enabled intentionally omitted — OCR is deferred to a later release
});
export type TProcessingConfigForm = z.infer<typeof ProcessingConfigFormSchema>;

export const ComplianceConfigFormSchema = z.object({
  retention_days: z.number().int().positive().nullable(),
  worm_enabled: z.boolean(),
  legal_hold_enabled: z.boolean(),
  data_residency: z.string().nullable(),
});
export type TComplianceConfigForm = z.infer<typeof ComplianceConfigFormSchema>;
