/**
 * entities/schemas/project-config/response — Zod schema for the GET /v1/projects/{id}/config response.
 *
 * List fields (allowed_mime_types, allowed_extensions, allowed_ips, allowed_origins)
 * are returned as string[] | null by the backend — null means no restriction.
 *
 * @module
 */
import { z } from "zod";

export const ProjectConfigSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  project_id: z.string(),

  // Upload restrictions
  max_file_size_bytes: z.number().int().positive().nullable(),
  allowed_mime_types: z.array(z.string()).nullable(),
  allowed_extensions: z.array(z.string()).nullable(),
  max_files_per_request: z.number().int().positive().nullable(),

  // Network security
  allowed_ips: z.array(z.string()).nullable(),
  allowed_origins: z.array(z.string()).nullable(),
  require_signed_urls: z.boolean(),
  signed_url_ttl_seconds: z.number().int(),

  // Processing
  versioning_enabled: z.boolean(),
  ocr_enabled: z.boolean(),
  virus_scan_enabled: z.boolean(),

  // Compliance
  retention_days: z.number().int().positive().nullable(),
  worm_enabled: z.boolean(),
  legal_hold_enabled: z.boolean(),
  data_residency: z.string().nullable(),

  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type TProjectConfig = z.infer<typeof ProjectConfigSchema>;
