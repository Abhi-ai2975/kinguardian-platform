/**
 * Patient React Hook Form schemas.
 *
 * Layer: entities / schemas / patient
 *
 * Flat UI schemas used by the patient Create and Edit modals.
 * These are intentionally simpler than the validation schemas — the modal
 * maps flat form values to the nested fhir-gql API payload before calling
 * the server action.
 *
 * Form schemas live here (forms.ts), not in input.ts, so the server module
 * has no dependency on React Hook Form concerns.
 */

import { z } from "zod";
import { GenderSchema } from "./input";

/**
 * Flat form schema for the "Create Patient" modal.
 * Collects the minimum required fields plus common optional ones.
 */
export const CreatePatientFormSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  org_id: z.string().min(1, "Organisation ID is required"),
  gender: GenderSchema.optional(),
  birth_date: z.string().optional(),
  active: z.boolean().optional(),
  // Common name fields collected inline on the create form.
  family_name: z.string().optional(),
  given_name: z.string().optional(),
});
export type TCreatePatientFormSchema = z.infer<typeof CreatePatientFormSchema>;

/**
 * Flat form schema for the "Edit Patient" modal.
 * Only patchable scalar fields — sub-resources are managed separately.
 */
export const EditPatientFormSchema = z.object({
  active: z.boolean().optional(),
  gender: GenderSchema.optional(),
  birth_date: z.string().optional(),
  marital_status_code: z.string().optional(),
  marital_status_display: z.string().optional(),
});
export type TEditPatientFormSchema = z.infer<typeof EditPatientFormSchema>;
