/**
 * admin_practitioner_create_schema.ts
 *
 * Layer: client / ai-hub / schemas / validation / practitioner
 *
 * Zod validation + transform for the Admin Create Practitioner step 1 form.
 *
 * Difference from practitioner_create_schema:
 *   The normal workflow seeds user_id from the admin's own session via
 *   buildBaseContext(). This admin variant accepts target_user_id from the
 *   form and maps it to user_id in the POST body, overriding the session
 *   value so the new Practitioner resource is linked to the correct user
 *   account — not the admin who submitted the form.
 *
 * Field mapping:
 *   target_user_id (form TextField) → user_id (FHIR POST body)
 *   org_id         (session context) → org_id (unchanged)
 *   active         (CheckBox)        → active
 *   gender         (TerminologySelect code) → gender
 *   birth_date     (TextField date)  → birth_date
 */

import { z } from "zod";

/** Coerces empty / null / "null" / "undefined" strings to undefined. */
const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

export const adminPractitionerCreateSchema = z
  .object({
    /** Provided by the admin via the form — the platform user to link this practitioner to. */
    target_user_id: z.preprocess(toOptionalStr, z.string().optional()),

    /** Session-seeded admin user ID — present in context but intentionally ignored here. */
    user_id: z.preprocess(toOptionalStr, z.string().optional()),

    /** Session-seeded active organisation ID. */
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    active:     z.boolean().optional(),
    gender:     z.preprocess(toOptionalStr, z.string().optional()),
    birth_date: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id:    d.target_user_id,
    org_id:     d.org_id,
    active:     d.active ?? true,
    gender:     d.gender     || undefined,
    birth_date: d.birth_date || undefined,
  }));
