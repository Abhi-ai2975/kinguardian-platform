/**
 * Encounter React Hook Form schemas.
 *
 * Layer: entities / schemas / encounter
 *
 * Flat UI schemas used in React Hook Form modals/forms.
 * The modal maps flat form values → nested API payload before calling the action.
 * Populated by /client-module when the Encounter UI is scaffolded.
 */

import { z } from "zod";

/** Flat schema for the Create Encounter form. */
export const CreateEncounterFormSchema = z.object({
  status: z.string().min(1, "Status is required"),
  subject: z.string().optional(),
  actual_period_start: z.string().optional(),
  actual_period_end: z.string().optional(),
  priority_code: z.string().optional(),
  priority_display: z.string().optional(),
});
export type TCreateEncounterFormSchema = z.infer<typeof CreateEncounterFormSchema>;

/** Flat schema for the Edit Encounter form (scalar patch fields only). */
export const EditEncounterFormSchema = z.object({
  status: z.string().optional(),
  actual_period_end: z.string().optional(),
  priority_code: z.string().optional(),
  priority_display: z.string().optional(),
  planned_end_date: z.string().optional(),
});
export type TEditEncounterFormSchema = z.infer<typeof EditEncounterFormSchema>;
