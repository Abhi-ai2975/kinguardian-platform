/**
 * MedicationRequest ZSA server action schemas.
 *
 * Layer: entities / schemas / medication-request
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateMedicationRequestValidationSchema,
  UpdateMedicationRequestValidationSchema,
  ListMedicationRequestsValidationSchema,
  GetByIdMedicationRequestValidationSchema,
  DeleteMedicationRequestValidationSchema,
} from "./input";

export const CreateMedicationRequestActionSchema = z.object({
  payload: CreateMedicationRequestValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateMedicationRequestAction = z.infer<typeof CreateMedicationRequestActionSchema>;

export const ListMedicationRequestsActionSchema = z.object({
  payload: ListMedicationRequestsValidationSchema.optional(),
});
export type TListMedicationRequestsAction = z.infer<typeof ListMedicationRequestsActionSchema>;

export const GetMedicationRequestByIdActionSchema = z.object({
  payload: GetByIdMedicationRequestValidationSchema,
});
export type TGetMedicationRequestByIdAction = z.infer<typeof GetMedicationRequestByIdActionSchema>;

export const UpdateMedicationRequestActionSchema = z.object({
  payload: UpdateMedicationRequestValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateMedicationRequestAction = z.infer<typeof UpdateMedicationRequestActionSchema>;

export const DeleteMedicationRequestActionSchema = z.object({
  payload: DeleteMedicationRequestValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteMedicationRequestAction = z.infer<typeof DeleteMedicationRequestActionSchema>;
