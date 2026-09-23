/**
 * admin_patient_create_schema.ts
 *
 * Layer: client / ai-hub / schemas / validation / patient
 *
 * Zod validation for the Admin Create Patient step 1 form.
 *
 * Difference from patient_create_schema:
 *   The normal workflow seeds user_id from the admin's own session via
 *   buildBaseContext(). This admin variant accepts target_user_id from the
 *   form and maps it to user_id in the POST body, overriding the session
 *   value so the new Patient resource is linked to the correct user account —
 *   not the admin who submitted the form. No fallback to session user_id.
 *
 * Field mapping:
 *   target_user_id  (form TextField) → user_id (FHIR POST body)
 *   org_id          (session context) → org_id (unchanged)
 *   gender          (TerminologySelect code) → gender
 *   birth_date      (DateTimeInput)   → birth_date
 *   active          (CheckBox)        → active
 *   deceased_boolean (CheckBox)       → deceased_boolean
 *   deceased_datetime (DateTimeInput) → deceased_datetime
 *   marital_status_* (TerminologySelect CodeableConcept) → marital_status_*
 */

import { z } from "zod";

export const adminPatientCreateSchema = z.object({
  /** Provided by the admin via the form — the platform user to link this patient to. */
  target_user_id: z.string().min(1, "Target user is required"),

  /** Session-seeded admin user ID — present in context but intentionally ignored here. */
  user_id: z.string().optional(),

  /** Session-seeded active organisation ID. */
  org_id: z.string().optional(),

  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
  active: z.boolean().optional(),
  deceased_boolean: z.boolean().optional(),
  deceased_datetime: z.string().optional(),
  marital_status_code: z.string().optional(),
  marital_status_system: z.string().optional(),
  marital_status_display: z.string().optional(),
  marital_status_text: z.string().optional(),
}).transform((d) => ({
  user_id:               d.target_user_id,
  org_id:                d.org_id,
  gender:                d.gender,
  birth_date:            d.birth_date,
  active:                d.active,
  deceased_boolean:      d.deceased_boolean,
  deceased_datetime:     d.deceased_datetime,
  marital_status_code:   d.marital_status_code,
  marital_status_system: d.marital_status_system,
  marital_status_display: d.marital_status_display,
  marital_status_text:   d.marital_status_text,
}));
