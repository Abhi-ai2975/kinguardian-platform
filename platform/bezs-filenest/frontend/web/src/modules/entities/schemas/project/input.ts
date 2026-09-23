/**
 * entities/schemas/project/input — validation schemas for project mutations.
 *
 * Used by controllers (server-side Zod validation → InputParseError) and by
 * client forms (React Hook Form resolver). No Next.js or React imports here.
 *
 * @module
 */
import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z.string().optional(),
  description: z.string().optional(),
  storage_mode: z.enum(["managed", "byob"]).default("managed"),
  storage_provider: z
    .enum(["s3", "azure_blob", "gcs", "minio", "r2", "rustfs"])
    .default("s3"),
});

export type TCreateProject = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  versioning_enabled: z.boolean().optional(),
  ocr_enabled: z.boolean().optional(),
});

export type TUpdateProject = z.infer<typeof UpdateProjectSchema>;

export const DeleteProjectSchema = z.object({
  projectId: z.string().min(1),
});

export type TDeleteProject = z.infer<typeof DeleteProjectSchema>;

export const ListProjectsParamsSchema = z.object({
  page: z.number().int().min(1).optional(),
  page_size: z.number().int().min(1).max(100).optional(),
  sort_by: z.enum(["name", "created_at", "storage_provider", "storage_mode"]).optional(),
  sort_dir: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
  storage_provider: z.string().optional(),
  storage_mode: z.enum(["managed", "byob"]).optional(),
});

export type TListProjectsParams = z.infer<typeof ListProjectsParamsSchema>;
