/**
 * MedicationRequest React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / medication-request
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the MedicationRequest UI is scaffolded.
 */

import { z } from "zod";

export const CreateMedicationRequestFormSchema = z.object({
  status: z.string().min(1, "Status is required"),
  intent: z.string().min(1, "Intent is required"),
  priority: z.string().optional(),
  medication_code_code: z.string().optional(),
  medication_code_display: z.string().optional(),
  subject: z.string().optional(),
  encounter_id: z.number().int().optional(),
  authored_on: z.string().optional(),
});
export type TCreateMedicationRequestFormSchema = z.infer<typeof CreateMedicationRequestFormSchema>;

export const EditMedicationRequestFormSchema = z.object({
  status: z.string().optional(),
  intent: z.string().optional(),
  priority: z.string().optional(),
  medication_code_code: z.string().optional(),
  medication_code_display: z.string().optional(),
});
export type TEditMedicationRequestFormSchema = z.infer<typeof EditMedicationRequestFormSchema>;
