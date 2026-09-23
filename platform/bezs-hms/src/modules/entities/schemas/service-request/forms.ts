/**
 * ServiceRequest React Hook Form schemas (stub).
 *
 * Layer: entities / schemas / service-request
 *
 * Flat UI schemas for React Hook Form modals/forms.
 * Populated by /client-module when the ServiceRequest UI is scaffolded.
 */

import { z } from "zod";

export const CreateServiceRequestFormSchema = z.object({
  status: z.string().min(1, "Status is required"),
  intent: z.string().min(1, "Intent is required"),
  priority: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  subject: z.string().optional(),
  encounter_id: z.number().int().optional(),
  authored_on: z.string().optional(),
  patient_instruction: z.string().optional(),
});
export type TCreateServiceRequestFormSchema = z.infer<typeof CreateServiceRequestFormSchema>;

export const EditServiceRequestFormSchema = z.object({
  status: z.string().optional(),
  intent: z.string().optional(),
  priority: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
});
export type TEditServiceRequestFormSchema = z.infer<typeof EditServiceRequestFormSchema>;
