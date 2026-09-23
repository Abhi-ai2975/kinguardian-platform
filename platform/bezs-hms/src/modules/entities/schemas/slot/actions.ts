/**
 * Slot ZSA action schemas.
 *
 * Layer: entities / schemas / slot
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
  CreateSlotValidationSchema,
  UpdateSlotValidationSchema,
  ListSlotsValidationSchema,
  GetByIdSlotValidationSchema,
  DeleteSlotValidationSchema,
  GenerateSlotsValidationSchema,
} from "./input";

/** Action schema for creating a Slot with all inline child arrays. */
export const CreateSlotActionSchema = z.object({
  payload: CreateSlotValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateSlotAction = z.infer<typeof CreateSlotActionSchema>;

/** Action schema for listing Slots with optional filters. */
export const ListSlotsActionSchema = z.object({
  payload: ListSlotsValidationSchema.optional(),
});
export type TListSlotsAction = z.infer<typeof ListSlotsActionSchema>;

/** Action schema for fetching a single Slot by ID. */
export const GetSlotByIdActionSchema = z.object({
  payload: GetByIdSlotValidationSchema,
});
export type TGetSlotByIdAction = z.infer<typeof GetSlotByIdActionSchema>;

/** Action schema for patching scalar fields on a Slot. */
export const UpdateSlotActionSchema = z.object({
  payload: UpdateSlotValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateSlotAction = z.infer<typeof UpdateSlotActionSchema>;

/** Action schema for deleting a Slot by ID. */
export const DeleteSlotActionSchema = z.object({
  payload: DeleteSlotValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteSlotAction = z.infer<typeof DeleteSlotActionSchema>;

/** Action schema for bulk-generating Slots for a Schedule within a time window. */
export const GenerateSlotsActionSchema = z.object({
  payload: GenerateSlotsValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TGenerateSlotsAction = z.infer<typeof GenerateSlotsActionSchema>;
