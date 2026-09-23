/**
 * entities/schemas/storage-config/actions — ZSA action envelope schemas.
 *
 * @module
 */
import { z } from "zod";
import { TransportOptionsSchema } from "../transport";
import { UpdateStorageConfigSchema, UpdateSseSchema, VerifyStorageSchema } from "./input";

export const GetStorageConfigActionSchema = z.object({
  payload: z.object({ projectId: z.string().min(1) }),
  transportOptions: TransportOptionsSchema.optional(),
});
export type TGetStorageConfigAction = z.infer<typeof GetStorageConfigActionSchema>;

export const UpdateStorageConfigActionSchema = z.object({
  payload: UpdateStorageConfigSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateStorageConfigAction = z.infer<typeof UpdateStorageConfigActionSchema>;

export const VerifyStorageActionSchema = z.object({
  payload: VerifyStorageSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TVerifyStorageAction = z.infer<typeof VerifyStorageActionSchema>;

export const UpdateSseActionSchema = z.object({
  payload: UpdateSseSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateSseAction = z.infer<typeof UpdateSseActionSchema>;
