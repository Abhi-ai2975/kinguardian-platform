/**
 * entities/schemas/project/response — Zod response schemas for the project domain.
 *
 * Defines the shape of data returned by the FileNest backend. Imported by
 * repository implementations (response validation) and server components
 * (typing fetched data). No Next.js or React imports here.
 *
 * @module
 */
import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  storage_mode: z.string(),
  storage_provider: z.string(),
  versioning_enabled: z.boolean(),
  ocr_enabled: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TProject = z.infer<typeof ProjectSchema>;

export const ProjectListSchema = z.object({
  items: z.array(ProjectSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export type TProjectList = z.infer<typeof ProjectListSchema>;
