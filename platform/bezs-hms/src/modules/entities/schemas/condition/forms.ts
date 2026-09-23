/**
 * Condition React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / condition
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the Condition UI is scaffolded.
 */

import { z } from "zod";

export const CreateConditionFormSchema = z.object({
  clinical_status_code: z.string().optional(),
  verification_status_code: z.string().optional(),
  severity_code: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  subject: z.string().optional(),
  encounter_id: z.number().int().optional(),
  onset_datetime: z.string().optional(),
  recorded_date: z.string().optional(),
});
export type TCreateConditionFormSchema = z.infer<typeof CreateConditionFormSchema>;

export const EditConditionFormSchema = z.object({
  clinical_status_code: z.string().optional(),
  verification_status_code: z.string().optional(),
  severity_code: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  abatement_datetime: z.string().optional(),
});
export type TEditConditionFormSchema = z.infer<typeof EditConditionFormSchema>;
