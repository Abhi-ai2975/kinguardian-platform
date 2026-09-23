/**
 * entities/schemas/project-config/actions — ZSA action envelope schemas for project config.
 *
 * @module
 */
import { z } from "zod";
import { TransportOptionsSchema } from "../transport";
import {
  UpdateUploadConfigSchema,
  UpdateSecurityConfigSchema,
  UpdateProcessingConfigSchema,
  UpdateComplianceConfigSchema,
} from "./input";

export const GetProjectConfigActionSchema = z.object({
  payload: z.object({ projectId: z.string().min(1) }),
  transportOptions: TransportOptionsSchema.optional(),
});
export type TGetProjectConfigAction = z.infer<typeof GetProjectConfigActionSchema>;

export const UpdateUploadConfigActionSchema = z.object({
  payload: UpdateUploadConfigSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateUploadConfigAction = z.infer<typeof UpdateUploadConfigActionSchema>;

export const UpdateSecurityConfigActionSchema = z.object({
  payload: UpdateSecurityConfigSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateSecurityConfigAction = z.infer<typeof UpdateSecurityConfigActionSchema>;

export const UpdateProcessingConfigActionSchema = z.object({
  payload: UpdateProcessingConfigSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateProcessingConfigAction = z.infer<typeof UpdateProcessingConfigActionSchema>;

export const UpdateComplianceConfigActionSchema = z.object({
  payload: UpdateComplianceConfigSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateComplianceConfigAction = z.infer<typeof UpdateComplianceConfigActionSchema>;
