/**
 * AiConsultation ZSA server action schemas.
 *
 * Layer: entities / schemas / ai-consultation
 *
 * Wraps each validation schema in the { payload, transportOptions? } shape
 * expected by ZSA server actions.
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  CreateAiConsultationValidationSchema,
  UpdateAiConsultationValidationSchema,
  LinkAiConsultationValidationSchema,
  AbandonAiConsultationValidationSchema,
  GetAiConsultationByIdValidationSchema,
} from "./input";

/** Action schema for starting a new AI consultation session. */
export const CreateAiConsultationActionSchema = z.object({
  payload: CreateAiConsultationValidationSchema,
});
export type TCreateAiConsultationAction = z.infer<
  typeof CreateAiConsultationActionSchema
>;

/** Action schema for completing an AI consultation (save transcript + report). */
export const UpdateAiConsultationActionSchema = z.object({
  payload: UpdateAiConsultationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdateAiConsultationAction = z.infer<
  typeof UpdateAiConsultationActionSchema
>;

/** Action schema for linking an AI consultation to a booked FHIR appointment. */
export const LinkAiConsultationActionSchema = z.object({
  payload: LinkAiConsultationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TLinkAiConsultationAction = z.infer<
  typeof LinkAiConsultationActionSchema
>;

/** Action schema for abandoning an in-progress AI consultation. */
export const AbandonAiConsultationActionSchema = z.object({
  payload: AbandonAiConsultationValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TAbandonAiConsultationAction = z.infer<
  typeof AbandonAiConsultationActionSchema
>;

/** Action schema for fetching a single AI consultation by its local ID. */
export const GetAiConsultationByIdActionSchema = z.object({
  payload: GetAiConsultationByIdValidationSchema,
});
export type TGetAiConsultationByIdAction = z.infer<
  typeof GetAiConsultationByIdActionSchema
>;
