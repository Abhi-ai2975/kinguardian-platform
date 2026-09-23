/**
 * Location ZSA action schemas.
 *
 * Layer: entities / schemas / location
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
  CreateLocationValidationSchema,
  PatchLocationValidationSchema,
  ListLocationsValidationSchema,
  GetLocationByIdValidationSchema,
  DeleteLocationValidationSchema,
} from "./input";

export const CreateLocationActionSchema = z.object({
  payload: CreateLocationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateLocationAction = z.infer<typeof CreateLocationActionSchema>;

/** Reads have no transportOptions — no side effects after a fetch. */
export const ListLocationsActionSchema = z.object({
  payload: ListLocationsValidationSchema.optional(),
});
export type TListLocationsAction = z.infer<typeof ListLocationsActionSchema>;

export const GetLocationByIdActionSchema = z.object({
  payload: GetLocationByIdValidationSchema,
});
export type TGetLocationByIdAction = z.infer<typeof GetLocationByIdActionSchema>;

export const UpdateLocationActionSchema = z.object({
  payload: PatchLocationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateLocationAction = z.infer<typeof UpdateLocationActionSchema>;

export const DeleteLocationActionSchema = z.object({
  payload: DeleteLocationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteLocationAction = z.infer<typeof DeleteLocationActionSchema>;
