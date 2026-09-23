/**
 * Schedule ZSA action schemas.
 *
 * Layer: entities / schemas / schedule
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
  CreateScheduleValidationSchema,
  PatchScheduleValidationSchema,
  ListSchedulesValidationSchema,
  GetScheduleByIdValidationSchema,
  DeleteScheduleValidationSchema,
} from "./input";

export const CreateScheduleActionSchema = z.object({
  payload: CreateScheduleValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateScheduleAction = z.infer<typeof CreateScheduleActionSchema>;

/** Reads have no transportOptions — no side effects after a fetch. */
export const ListSchedulesActionSchema = z.object({
  payload: ListSchedulesValidationSchema.optional(),
});
export type TListSchedulesAction = z.infer<typeof ListSchedulesActionSchema>;

export const GetScheduleByIdActionSchema = z.object({
  payload: GetScheduleByIdValidationSchema,
});
export type TGetScheduleByIdAction = z.infer<typeof GetScheduleByIdActionSchema>;

export const UpdateScheduleActionSchema = z.object({
  payload: PatchScheduleValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateScheduleAction = z.infer<typeof UpdateScheduleActionSchema>;

export const DeleteScheduleActionSchema = z.object({
  payload: DeleteScheduleValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteScheduleAction = z.infer<typeof DeleteScheduleActionSchema>;
