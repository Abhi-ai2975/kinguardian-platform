/**
 * Observation ZSA server action schemas.
 *
 * Layer: entities / schemas / observation
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateObservationValidationSchema,
  UpdateObservationValidationSchema,
  ListObservationsValidationSchema,
  GetByIdObservationValidationSchema,
  DeleteObservationValidationSchema,
} from "./input";

export const CreateObservationActionSchema = z.object({
  payload: CreateObservationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateObservationAction = z.infer<typeof CreateObservationActionSchema>;

export const ListObservationsActionSchema = z.object({
  payload: ListObservationsValidationSchema.optional(),
});
export type TListObservationsAction = z.infer<typeof ListObservationsActionSchema>;

export const GetObservationByIdActionSchema = z.object({
  payload: GetByIdObservationValidationSchema,
});
export type TGetObservationByIdAction = z.infer<typeof GetObservationByIdActionSchema>;

export const UpdateObservationActionSchema = z.object({
  payload: UpdateObservationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateObservationAction = z.infer<typeof UpdateObservationActionSchema>;

export const DeleteObservationActionSchema = z.object({
  payload: DeleteObservationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteObservationAction = z.infer<typeof DeleteObservationActionSchema>;
