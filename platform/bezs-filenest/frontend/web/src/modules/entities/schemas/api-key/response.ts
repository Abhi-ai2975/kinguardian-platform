/**
 * entities/schemas/api-key/response — Zod schemas for BetterAuth API key responses.
 *
 * BetterAuth stores scopes inside `metadata.scopes`. The full key string is only
 * returned on creation (the `key` field); list responses expose only `start` (prefix).
 *
 * @module
 */
import { z } from "zod";

export const ApiKeyMetadataSchema = z.object({
  organizationId: z.string().optional(),
  projectId: z.string().nullable().optional(),
  scopes: z.array(z.string()).optional(),
});

export type TApiKeyMetadata = z.infer<typeof ApiKeyMetadataSchema>;

export const ApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  start: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
  lastUsedAt: z.string().nullable().optional(),
  enabled: z.boolean(),
  organizationId: z.string().nullable().optional(),
  userId: z.string().optional(),
  metadata: ApiKeyMetadataSchema.nullable().optional(),
});

export type TApiKey = z.infer<typeof ApiKeySchema>;

export const ApiKeyListSchema = z.object({
  apiKeys: z.array(ApiKeySchema),
  total: z.number(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type TApiKeyList = z.infer<typeof ApiKeyListSchema>;

/** Shape returned only on key creation — includes the full key string (shown once). */
export const CreatedApiKeySchema = ApiKeySchema.extend({
  key: z.string(),
});

export type TCreatedApiKey = z.infer<typeof CreatedApiKeySchema>;
