/**
 * Appointment ZSA server action schemas.
 *
 * Layer: entities / schemas / appointment
 *
 * Wraps validation schemas in the { payload, transportOptions? } shape expected
 * by ZSA server actions. Mutating operations include transportOptions for cache
 * revalidation; read operations do not.
 *
 * Imports validation schemas from ./input (relative) to avoid circular barrel
 * references via index.ts.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  BookAppointmentValidationSchema,
  CreateAppointmentValidationSchema,
  UpdateAppointmentValidationSchema,
  ListAppointmentsValidationSchema,
  GetMyAppointmentsValidationSchema,
  GetByIdAppointmentValidationSchema,
  DeleteAppointmentValidationSchema,
  RescheduleAppointmentValidationSchema,
} from "./input";

/** Action schema for the simplified booking endpoint (POST /appointments/book). */
export const BookAppointmentActionSchema = z.object({
  payload: BookAppointmentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TBookAppointmentAction = z.infer<typeof BookAppointmentActionSchema>;

/** Action schema for full FHIR Appointment create (POST /appointments/). */
export const CreateAppointmentActionSchema = z.object({
  payload: CreateAppointmentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateAppointmentAction = z.infer<typeof CreateAppointmentActionSchema>;

/** Action schema for listing the caller's own appointments. */
export const GetMyAppointmentsActionSchema = z.object({
  payload: GetMyAppointmentsValidationSchema,
});
export type TGetMyAppointmentsAction = z.infer<typeof GetMyAppointmentsActionSchema>;

/** Action schema for listing all Appointments with optional filters. */
export const ListAppointmentsActionSchema = z.object({
  payload: ListAppointmentsValidationSchema.optional(),
});
export type TListAppointmentsAction = z.infer<typeof ListAppointmentsActionSchema>;

/** Action schema for fetching a single Appointment by ID. */
export const GetAppointmentByIdActionSchema = z.object({
  payload: GetByIdAppointmentValidationSchema,
});
export type TGetAppointmentByIdAction = z.infer<typeof GetAppointmentByIdActionSchema>;

/** Action schema for patching scalar fields on an Appointment. */
export const UpdateAppointmentActionSchema = z.object({
  payload: UpdateAppointmentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateAppointmentAction = z.infer<typeof UpdateAppointmentActionSchema>;

/** Action schema for deleting an Appointment by ID. */
export const DeleteAppointmentActionSchema = z.object({
  payload: DeleteAppointmentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteAppointmentAction = z.infer<typeof DeleteAppointmentActionSchema>;

/**
 * Action schema for POST /appointments/{id}/reschedule.
 * Atomically swaps the appointment's slot — frees old, books new, updates start/end.
 */
export const RescheduleAppointmentActionSchema = z.object({
  payload: RescheduleAppointmentValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TRescheduleAppointmentAction = z.infer<typeof RescheduleAppointmentActionSchema>;
