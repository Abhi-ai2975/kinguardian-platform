/**
 * PractitionerRole ZSA action schemas.
 *
 * Layer: entities / schemas / practitioner-role
 *
 * Wraps validation schemas in the shape expected by ZSA server actions
 * (payload + optional transportOptions). Mutating operations include
 * transportOptions; read operations do not.
 *
 * Imports validation schemas from ./input (relative) to avoid circular
 * barrel references via index.ts.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreatePractitionerRoleValidationSchema,
  UpdatePractitionerRoleValidationSchema,
  ListPractitionerRolesValidationSchema,
  ListPractitionerRolesForBookingValidationSchema,
  GetByIdPractitionerRoleValidationSchema,
  DeletePractitionerRoleValidationSchema,
} from "./input";

// ── Core CRUD action schemas ──────────────────────────────────────────────────

/** Action schema for creating a PractitionerRole with all inline sub-resources. */
export const CreatePractitionerRoleActionSchema = z.object({
  payload: CreatePractitionerRoleValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreatePractitionerRoleAction = z.infer<typeof CreatePractitionerRoleActionSchema>;

/** Action schema for listing PractitionerRoles with optional filters. */
export const ListPractitionerRolesActionSchema = z.object({
  payload: ListPractitionerRolesValidationSchema.optional(),
});
export type TListPractitionerRolesAction = z.infer<typeof ListPractitionerRolesActionSchema>;

/** Action schema for listing PractitionerRoles enriched for booking UIs. */
export const ListPractitionerRolesForBookingActionSchema = z.object({
  payload: ListPractitionerRolesForBookingValidationSchema.optional(),
});
export type TListPractitionerRolesForBookingAction = z.infer<typeof ListPractitionerRolesForBookingActionSchema>;

/** Action schema for fetching a single PractitionerRole by ID. */
export const GetPractitionerRoleByIdActionSchema = z.object({
  payload: GetByIdPractitionerRoleValidationSchema,
});
export type TGetPractitionerRoleByIdAction = z.infer<typeof GetPractitionerRoleByIdActionSchema>;

/** Action schema for patching scalar fields on a PractitionerRole. */
export const UpdatePractitionerRoleActionSchema = z.object({
  payload: UpdatePractitionerRoleValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdatePractitionerRoleAction = z.infer<typeof UpdatePractitionerRoleActionSchema>;

/** Action schema for deleting a PractitionerRole by ID. */
export const DeletePractitionerRoleActionSchema = z.object({
  payload: DeletePractitionerRoleValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePractitionerRoleAction = z.infer<typeof DeletePractitionerRoleActionSchema>;
