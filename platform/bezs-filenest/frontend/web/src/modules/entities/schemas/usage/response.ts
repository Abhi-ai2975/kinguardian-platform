/**
 * entities/schemas/usage/response — Zod response schemas for the usage domain.
 *
 * Mirrors UsageResponse from the FastAPI backend. One call returns both the
 * org-level headline stats and the per-project storage/file breakdown.
 *
 * @module
 */
import { z } from "zod";

export const UsageStatsSchema = z.object({
  total_files: z.number().int(),
  total_storage_bytes: z.number().int(),
  active_projects: z.number().int(),
  files_uploaded_30d: z.number().int(),
});
export type TUsageStats = z.infer<typeof UsageStatsSchema>;

export const ProjectUsageItemSchema = z.object({
  project_id: z.string(),
  name: z.string(),
  storage_bytes: z.number().int(),
  file_count: z.number().int(),
});
export type TProjectUsageItem = z.infer<typeof ProjectUsageItemSchema>;

export const UsageResponseSchema = z.object({
  stats: UsageStatsSchema,
  projects: z.array(ProjectUsageItemSchema),
});
export type TUsageResponse = z.infer<typeof UsageResponseSchema>;
