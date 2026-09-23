/**
 * entities/schemas/storage-config/response — Zod schemas for storage config API responses.
 *
 * config_encrypted is never returned by the API — only non-sensitive routing
 * fields are included. StorageVerifyResultSchema covers the probe response.
 * server_side_encryption is null for Azure Blob and GCS (always-on SSE).
 *
 * @module
 */
import { z } from "zod";

export const StorageConfigSchema = z.object({
  project_id: z.string(),
  environment: z.string(),
  storage_mode: z.enum(["managed", "byob"]),
  provider: z.enum(["s3", "azure_blob", "gcs", "minio", "r2", "rustfs"]),
  region: z.string().nullable(),
  bucket_name: z.string().nullable(),
  endpoint_url: z.string().nullable(),
  server_side_encryption: z.string().nullable(),
  sse_enabled: z.boolean(),
  status: z.enum(["active", "pending_verification", "verification_failed"]),
  last_verified_at: z.coerce.date().nullable(),
});

export type TStorageConfig = z.infer<typeof StorageConfigSchema>;

export const StorageVerifyResultSchema = z.object({
  ok: z.boolean(),
  latency_ms: z.number().nullable(),
  error: z.string().nullable(),
});

export type TStorageVerifyResult = z.infer<typeof StorageVerifyResultSchema>;
