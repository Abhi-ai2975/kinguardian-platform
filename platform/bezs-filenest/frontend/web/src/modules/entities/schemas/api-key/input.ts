/**
 * entities/schemas/api-key/input — validation schemas for API key mutations.
 *
 * @module
 */
import { z } from "zod";

export const AVAILABLE_SCOPES = [
  // Files
  "files:upload",
  "files:download",
  "files:read",
  "files:delete",
  "files:metadata",
  // Folders
  "folders:read",
  "folders:write",
  // Upload tokens
  "upload_tokens:create",
  // Webhooks
  "webhooks:read",
  "webhooks:write",
  // Projects
  "projects:read",
  "projects:update",
  // Audit & compliance
  "audit:read",
  "compliance:manage",
] as const;

export type TScope = (typeof AVAILABLE_SCOPES)[number];

export const CreateApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  organizationId: z.string().min(1),
  projectId: z.string().optional(),
  scopes: z.array(z.enum(AVAILABLE_SCOPES)).min(1, "Select at least one scope"),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type TCreateApiKey = z.infer<typeof CreateApiKeySchema>;

export const ListApiKeysSchema = z.object({
  organizationId: z.string().min(1),
  projectId: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(["createdAt", "name", "expiresAt"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
});

export type TListApiKeys = z.infer<typeof ListApiKeysSchema>;

export const RevokeApiKeySchema = z.object({
  keyId: z.string().min(1),
});

export type TRevokeApiKey = z.infer<typeof RevokeApiKeySchema>;
