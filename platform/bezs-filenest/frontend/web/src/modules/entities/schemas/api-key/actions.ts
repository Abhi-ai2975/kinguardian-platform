/**
 * entities/schemas/api-key/actions — ZSA action envelope schemas.
 *
 * Every action carries transportOptions so any action can trigger revalidation.
 *
 * @module
 */
import { z } from "zod";
import { TransportOptionsSchema } from "../transport";
import { CreateApiKeySchema, ListApiKeysSchema, RevokeApiKeySchema } from "./input";

export const ListApiKeysActionSchema = z.object({
  payload: ListApiKeysSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TListApiKeysAction = z.infer<typeof ListApiKeysActionSchema>;

export const CreateApiKeyActionSchema = z.object({
  payload: CreateApiKeySchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TCreateApiKeyAction = z.infer<typeof CreateApiKeyActionSchema>;

export const RevokeApiKeyActionSchema = z.object({
  payload: RevokeApiKeySchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TRevokeApiKeyAction = z.infer<typeof RevokeApiKeyActionSchema>;
