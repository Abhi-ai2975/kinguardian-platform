/**
 * Observation React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / observation
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the Observation UI is scaffolded.
 */

import { z } from "zod";

export const CreateObservationFormSchema = z.object({
  status: z.string().min(1, "Status is required"),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  subject: z.string().optional(),
  encounter_id: z.number().int().optional(),
  effective_date_time: z.string().optional(),
  value_quantity_value: z.number().optional(),
  value_quantity_unit: z.string().optional(),
  value_string: z.string().optional(),
});
export type TCreateObservationFormSchema = z.infer<typeof CreateObservationFormSchema>;

export const EditObservationFormSchema = z.object({
  status: z.string().optional(),
  code_code: z.string().optional(),
  effective_date_time: z.string().optional(),
  value_quantity_value: z.number().optional(),
  value_quantity_unit: z.string().optional(),
  value_string: z.string().optional(),
});
export type TEditObservationFormSchema = z.infer<typeof EditObservationFormSchema>;
