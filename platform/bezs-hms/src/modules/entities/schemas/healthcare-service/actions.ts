/**
 * HealthcareService ZSA action schemas.
 *
 * Layer: entities / schemas / healthcare-service
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
  CreateHealthcareServiceValidationSchema,
  PatchHealthcareServiceValidationSchema,
  ListHealthcareServicesValidationSchema,
  GetHealthcareServiceByIdValidationSchema,
  DeleteHealthcareServiceValidationSchema,
} from "./input";

export const CreateHealthcareServiceActionSchema = z.object({
  payload: CreateHealthcareServiceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateHealthcareServiceAction = z.infer<
  typeof CreateHealthcareServiceActionSchema
>;

/** Reads have no transportOptions — no side effects after a fetch. */
export const ListHealthcareServicesActionSchema = z.object({
  payload: ListHealthcareServicesValidationSchema.optional(),
});
export type TListHealthcareServicesAction = z.infer<
  typeof ListHealthcareServicesActionSchema
>;

export const GetHealthcareServiceByIdActionSchema = z.object({
  payload: GetHealthcareServiceByIdValidationSchema,
});
export type TGetHealthcareServiceByIdAction = z.infer<
  typeof GetHealthcareServiceByIdActionSchema
>;

export const UpdateHealthcareServiceActionSchema = z.object({
  payload: PatchHealthcareServiceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateHealthcareServiceAction = z.infer<
  typeof UpdateHealthcareServiceActionSchema
>;

export const DeleteHealthcareServiceActionSchema = z.object({
  payload: DeleteHealthcareServiceValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteHealthcareServiceAction = z.infer<
  typeof DeleteHealthcareServiceActionSchema
>;
