/**
 * entities/schemas/storage-config/forms — React Hook Form schema for the BYOB settings form.
 *
 * Adds cross-field validation on top of the input schema.
 * Required credential fields depend on the provider family:
 *
 *   S3 / MinIO / RustFS / R2  →  access_key_id + secret_access_key
 *   Azure Blob                →  account_name + account_key
 *   GCS                       →  credentials_json
 *
 * Additional S3-only rules:
 *   - endpoint_url required for minio, r2, rustfs
 *   - kms_key_id required when server_side_encryption is aws:kms
 *
 * @module
 */
import { z } from "zod";

export const PROVIDERS_REQUIRING_ENDPOINT = ["minio", "r2", "rustfs"] as const;
export const S3_FAMILY_PROVIDERS = ["s3", "minio", "rustfs", "r2"] as const;

export type TProviderFamily = "s3_family" | "azure_blob" | "gcs";

export function getProviderFamily(provider: string): TProviderFamily {
  if ((S3_FAMILY_PROVIDERS as readonly string[]).includes(provider)) return "s3_family";
  if (provider === "azure_blob") return "azure_blob";
  return "gcs";
}

export const StorageConfigFormSchema = z
  .object({
    // read-only — passed for conditional validation and field rendering
    provider: z.enum(["s3", "azure_blob", "gcs", "minio", "r2", "rustfs"]),

    // universal
    bucket_name: z.string().min(1, "Bucket / container name is required"),

    // S3-family routing
    region: z.string().optional(),
    endpoint_url: z.string().optional(),

    // S3-compatible credentials
    access_key_id: z.string().optional(),
    secret_access_key: z.string().optional(),
    server_side_encryption: z.enum(["AES256", "aws:kms"]),
    kms_key_id: z.string().optional(),

    // Azure Blob credentials
    account_name: z.string().optional(),
    account_key: z.string().optional(),

    // GCS credentials
    credentials_json: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const family = getProviderFamily(data.provider);

    if (family === "s3_family") {
      if (!data.access_key_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["access_key_id"], message: "Access key ID is required" });
      }
      if (!data.secret_access_key) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["secret_access_key"], message: "Secret access key is required" });
      }
      if ((PROVIDERS_REQUIRING_ENDPOINT as readonly string[]).includes(data.provider) && !data.endpoint_url) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endpoint_url"], message: "Endpoint URL is required for this provider" });
      }
      if (data.server_side_encryption === "aws:kms" && !data.kms_key_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["kms_key_id"], message: "KMS key ARN is required when using aws:kms encryption" });
      }
    }

    if (family === "azure_blob") {
      if (!data.account_name) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["account_name"], message: "Storage account name is required" });
      }
      if (!data.account_key) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["account_key"], message: "Storage access key is required" });
      }
    }

    if (family === "gcs") {
      if (!data.credentials_json) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["credentials_json"], message: "Service account JSON is required" });
      }
    }
  });

export type TStorageConfigForm = z.infer<typeof StorageConfigFormSchema>;

export const SseFormSchema = z.object({
  sse_enabled: z.boolean(),
});

export type TSseForm = z.infer<typeof SseFormSchema>;
