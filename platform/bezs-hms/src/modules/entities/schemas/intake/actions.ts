/**
 * Intake ZSA server action schemas.
 *
 * Layer: entities / schemas / intake
 *
 * Wraps each validation schema in the { payload, transportOptions? } shape
 * expected by ZSA server actions.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateIntakeValidationSchema,
  UpdateIntakeValidationSchema,
  LinkIntakeValidationSchema,
  AbandonIntakeValidationSchema,
  GetIntakeByIdValidationSchema,
  GetIntakeByFhirAppointmentIdValidationSchema,
  ListIntakesValidationSchema,
} from "./input";

/** Action schema for starting a new intake session. */
export const CreateIntakeActionSchema = z.object({
  payload: CreateIntakeValidationSchema,
});
export type TCreateIntakeAction = z.infer<typeof CreateIntakeActionSchema>;

/** Action schema for completing an intake (save transcript + report). */
export const UpdateIntakeActionSchema = z.object({
  payload: UpdateIntakeValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateIntakeAction = z.infer<typeof UpdateIntakeActionSchema>;

/** Action schema for linking an intake to a booked FHIR appointment. */
export const LinkIntakeActionSchema = z.object({
  payload: LinkIntakeValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TLinkIntakeAction = z.infer<typeof LinkIntakeActionSchema>;

/** Action schema for abandoning an in-progress intake. */
export const AbandonIntakeActionSchema = z.object({
  payload: AbandonIntakeValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAbandonIntakeAction = z.infer<typeof AbandonIntakeActionSchema>;

/** Action schema for fetching a single intake by its local ID. */
export const GetIntakeByIdActionSchema = z.object({
  payload: GetIntakeByIdValidationSchema,
});
export type TGetIntakeByIdAction = z.infer<typeof GetIntakeByIdActionSchema>;

/** Action schema for the doctor-side intake lookup by FHIR appointment ID. */
export const GetIntakeByFhirAppointmentIdActionSchema = z.object({
  payload: GetIntakeByFhirAppointmentIdValidationSchema,
});
export type TGetIntakeByFhirAppointmentIdAction = z.infer<
  typeof GetIntakeByFhirAppointmentIdActionSchema
>;

/** Action schema for paginated AI Intake list. */
export const ListIntakesActionSchema = z.object({
  payload: ListIntakesValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TListIntakesAction = z.infer<typeof ListIntakesActionSchema>;
