/**
 * Condition ZSA server action schemas.
 *
 * Layer: entities / schemas / condition
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateConditionValidationSchema,
  UpdateConditionValidationSchema,
  ListConditionsValidationSchema,
  GetByIdConditionValidationSchema,
  DeleteConditionValidationSchema,
} from "./input";

export const CreateConditionActionSchema = z.object({
  payload: CreateConditionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateConditionAction = z.infer<typeof CreateConditionActionSchema>;

export const ListConditionsActionSchema = z.object({
  payload: ListConditionsValidationSchema.optional(),
});
export type TListConditionsAction = z.infer<typeof ListConditionsActionSchema>;

export const GetConditionByIdActionSchema = z.object({
  payload: GetByIdConditionValidationSchema,
});
export type TGetConditionByIdAction = z.infer<typeof GetConditionByIdActionSchema>;

export const UpdateConditionActionSchema = z.object({
  payload: UpdateConditionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateConditionAction = z.infer<typeof UpdateConditionActionSchema>;

export const DeleteConditionActionSchema = z.object({
  payload: DeleteConditionValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteConditionAction = z.infer<typeof DeleteConditionActionSchema>;
