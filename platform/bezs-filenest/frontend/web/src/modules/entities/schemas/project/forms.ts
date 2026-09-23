/**
 * entities/schemas/project/forms — flat React Hook Form schemas.
 *
 * These mirror the input schemas but are optimised for RHF field registration
 * (no nested objects, all fields at the top level). Import in client form
 * components as the `zodResolver` argument.
 *
 * @module
 */
import { z } from "zod";

export const CreateProjectFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z.string().optional(),
  description: z.string().optional(),
  storage_mode: z.enum(["managed", "byob"]),
  storage_provider: z.enum(["s3", "azure_blob", "gcs", "minio", "r2", "rustfs"]),
});

export type TCreateProjectForm = z.infer<typeof CreateProjectFormSchema>;

export const UpdateProjectFormSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  versioning_enabled: z.boolean().optional(),
  ocr_enabled: z.boolean().optional(),
});

export type TUpdateProjectForm = z.infer<typeof UpdateProjectFormSchema>;
