/**
 * entities/schemas/storage-config/input — mutation schemas for storage config.
 *
 * Used by the controller (server-side validation) and passed through to the
 * backend. Credential fields are optional at this layer — the backend validates
 * which are required based on the existing provider stored in the DB.
 *
 * No Next.js or React imports here — safe in both environments.
 *
 * @module
 */
import { z } from "zod";

export const UpdateStorageConfigSchema = z.object({
  projectId: z.string().min(1),
  bucket_name: z.string().min(1, "Bucket name is required"),
  region: z.string().optional(),
  endpoint_url: z.string().optional(),

  // S3-compatible (s3 / minio / rustfs / r2)
  access_key_id: z.string().optional(),
  secret_access_key: z.string().optional(),
  server_side_encryption: z.enum(["AES256", "aws:kms"]).default("AES256"),
  kms_key_id: z.string().optional(),

  // Azure Blob Storage
  account_name: z.string().optional(),
  account_key: z.string().optional(),

  // Google Cloud Storage
  credentials_json: z.string().optional(),
});

export type TUpdateStorageConfig = z.infer<typeof UpdateStorageConfigSchema>;

export const VerifyStorageSchema = z.object({
  projectId: z.string().min(1),
});

export type TVerifyStorage = z.infer<typeof VerifyStorageSchema>;

export const UpdateSseSchema = z.object({
  projectId: z.string().min(1),
  sse_enabled: z.boolean(),
});

export type TUpdateSse = z.infer<typeof UpdateSseSchema>;
