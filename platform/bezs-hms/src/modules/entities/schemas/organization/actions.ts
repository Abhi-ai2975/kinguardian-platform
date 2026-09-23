/**
 * Organization ZSA action schemas.
 *
 * Layer: entities / schemas / organization
 *
 * Wraps every input validation schema in the ZSA action envelope:
 *  - Mutating operations include `transportOptions` for cache revalidation.
 *  - Read operations (list, getById) do not.
 *
 * Imports validation schemas from "./input" (relative) to avoid circular
 * barrel self-import when this file is re-exported from index.ts.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  RegisterOrgValidationSchema,
  PatchOrgValidationSchema,
  ListOrgsValidationSchema,
  GetOrgByIdValidationSchema,
  DeleteOrgValidationSchema,
} from "./input";

export const RegisterOrgActionSchema = z.object({
  payload: RegisterOrgValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TRegisterOrgAction = z.infer<typeof RegisterOrgActionSchema>;

/** Reads have no transportOptions — no side effects after a fetch. */
export const ListOrgsActionSchema = z.object({
  payload: ListOrgsValidationSchema.optional(),
});
export type TListOrgsAction = z.infer<typeof ListOrgsActionSchema>;

export const GetOrgByIdActionSchema = z.object({
  payload: GetOrgByIdValidationSchema,
});
export type TGetOrgByIdAction = z.infer<typeof GetOrgByIdActionSchema>;

export const PatchOrgActionSchema = z.object({
  payload: PatchOrgValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchOrgAction = z.infer<typeof PatchOrgActionSchema>;

export const DeleteOrgActionSchema = z.object({
  payload: DeleteOrgValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteOrgAction = z.infer<typeof DeleteOrgActionSchema>;
