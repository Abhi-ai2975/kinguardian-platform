import z from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";

// ------------------------------------------------------------------ //
// Base API key shape (what the DB / BetterAuth returns)
// ------------------------------------------------------------------ //
export const ApiKeySchema = z.object({
  id: z.string(),
  configId: z.string().default("default"),
  name: z.string().nullable(),
  start: z.string().nullable(),       // first few chars of the raw key, for display
  prefix: z.string().nullable(),
  referenceId: z.string(),            // userId or organizationId
  enabled: z.boolean().default(true),
  rateLimitEnabled: z.boolean().default(true),
  rateLimitTimeWindow: z.number().nullable(),
  rateLimitMax: z.number().nullable(),
  requestCount: z.number().default(0),
  remaining: z.number().nullable(),
  refillAmount: z.number().nullable(),
  refillInterval: z.number().nullable(),
  lastRefillAt: z.coerce.date().nullable(),
  lastRequest: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  permissions: z.string().nullable(),  // JSON string
  metadata: z.string().nullable(),     // JSON string
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TApiKeySchema = z.infer<typeof ApiKeySchema>;

// Returned once on creation — includes the raw key
export const ApiKeyCreatedSchema = ApiKeySchema.extend({
  key: z.string(),
});
export type TApiKeyCreatedSchema = z.infer<typeof ApiKeyCreatedSchema>;

export const ListApiKeysResponseSchema = z.object({
  apiKeys: z.array(ApiKeySchema),
  total: z.number(),
});
export type TListApiKeysResponseSchema = z.infer<typeof ListApiKeysResponseSchema>;

// ------------------------------------------------------------------ //
// List query schema
// ------------------------------------------------------------------ //
export const ListApiKeysQuerySchema = z.object({
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  configId: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type TListApiKeysQuerySchema = z.infer<typeof ListApiKeysQuerySchema>;

// ------------------------------------------------------------------ //
// Create
// ------------------------------------------------------------------ //
export const CreateApiKeyValidationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  userId: z.string().min(1, "User ID is required"),
  organizationId: z.string().optional(),
  configId: z.string().optional(),
  prefix: z.string().max(20).optional(),
  expiresIn: z.number().positive().optional().nullable(),   // seconds
  remaining: z.number().int().positive().optional().nullable(),
  refillAmount: z.number().int().positive().optional().nullable(),
  refillInterval: z.number().int().positive().optional().nullable(), // ms
  rateLimitEnabled: z.boolean().optional(),
  rateLimitTimeWindow: z.number().int().positive().optional().nullable(), // ms
  rateLimitMax: z.number().int().positive().optional().nullable(),
  permissions: z.string().optional().nullable(),  // raw JSON string
  metadata: z.string().optional().nullable(),     // raw JSON string
});
export type TCreateApiKeyValidationSchema = z.infer<typeof CreateApiKeyValidationSchema>;

export const CreateApiKeyActionSchema = z.object({
  payload: CreateApiKeyValidationSchema,
  transportOptions: TransportOptionsSchema,
});

// ------------------------------------------------------------------ //
// Update
// ------------------------------------------------------------------ //
export const UpdateApiKeyValidationSchema = z.object({
  keyId: z.string(),
  name: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  expiresIn: z.number().positive().optional().nullable(),
  remaining: z.number().int().positive().optional().nullable(),
  refillAmount: z.number().int().positive().optional().nullable(),
  refillInterval: z.number().int().positive().optional().nullable(),
  rateLimitEnabled: z.boolean().optional(),
  rateLimitTimeWindow: z.number().int().positive().optional().nullable(),
  rateLimitMax: z.number().int().positive().optional().nullable(),
  permissions: z.string().optional().nullable(),
  metadata: z.string().optional().nullable(),
  configId: z.string().optional(),
});
export type TUpdateApiKeyValidationSchema = z.infer<typeof UpdateApiKeyValidationSchema>;

export const UpdateApiKeyActionSchema = z.object({
  payload: UpdateApiKeyValidationSchema,
  transportOptions: TransportOptionsSchema,
});

// ------------------------------------------------------------------ //
// Delete
// ------------------------------------------------------------------ //
export const DeleteApiKeyValidationSchema = z.object({
  keyId: z.string(),
  configId: z.string().optional(),
});
export type TDeleteApiKeyValidationSchema = z.infer<typeof DeleteApiKeyValidationSchema>;

export const DeleteApiKeyActionSchema = z.object({
  payload: DeleteApiKeyValidationSchema,
  transportOptions: TransportOptionsSchema,
});

// ------------------------------------------------------------------ //
// Delete expired (bulk)
// ------------------------------------------------------------------ //
export const DeleteExpiredApiKeysValidationSchema = z.object({
  configId: z.string().optional(),
});
export type TDeleteExpiredApiKeysValidationSchema = z.infer<typeof DeleteExpiredApiKeysValidationSchema>;

export const DeleteExpiredApiKeysActionSchema = z.object({
  payload: DeleteExpiredApiKeysValidationSchema,
  transportOptions: TransportOptionsSchema,
});
