/**
 * Consultation ZSA server action schemas.
 *
 * Layer: entities / schemas / consultation
 *
 * Wraps each validation schema in the { payload, transportOptions? } shape
 * expected by ZSA authenticatedProcedure server actions.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateConsultationValidationSchema,
  CompleteConsultationValidationSchema,
  SaveClinicalDataValidationSchema,
  AbandonConsultationValidationSchema,
  GetConsultationByFhirAppointmentIdValidationSchema,
  ListConsultationsValidationSchema,
} from "./input";

/** Action schema for provisioning a consultation room after booking. */
export const CreateConsultationActionSchema = z.object({
  payload: CreateConsultationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateConsultationAction = z.infer<typeof CreateConsultationActionSchema>;

/** Action schema for completing a consultation (transcript + reports). */
export const CompleteConsultationActionSchema = z.object({
  payload: CompleteConsultationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCompleteConsultationAction = z.infer<typeof CompleteConsultationActionSchema>;

/** Action schema for saving extracted FHIR clinical resources. */
export const SaveClinicalDataActionSchema = z.object({
  payload: SaveClinicalDataValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TSaveClinicalDataAction = z.infer<typeof SaveClinicalDataActionSchema>;

/** Action schema for abandoning a consultation. */
export const AbandonConsultationActionSchema = z.object({
  payload: AbandonConsultationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAbandonConsultationAction = z.infer<typeof AbandonConsultationActionSchema>;

/** Action schema for fetching a consultation by FHIR appointment ID. */
export const GetConsultationByFhirAppointmentIdActionSchema = z.object({
  payload: GetConsultationByFhirAppointmentIdValidationSchema,
});
export type TGetConsultationByFhirAppointmentIdAction = z.infer<
  typeof GetConsultationByFhirAppointmentIdActionSchema
>;

/** Action schema for paginated AI Consultation list. */
export const ListConsultationsActionSchema = z.object({
  payload: ListConsultationsValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TListConsultationsAction = z.infer<typeof ListConsultationsActionSchema>;
