/**
 * admin_select_patient_schema — Zod validation for Step 1 of upload_patient_report.
 *
 * Layer: client / ai-hub / schemas / validation / patient
 *
 * Validates that the admin has selected a patient before the GET /patients/{id}
 * confirmation call fires. The patient_id is emitted by the DynamicSelect
 * component (id="patient_select", emit key="patient_id") and arrives as a
 * plain form value — string or number — depending on browser serialisation.
 *
 * No request body is sent for this GET action; this schema gates the submission.
 */

import { z } from "zod";

/** Coerces any string/number representation to a positive integer; returns -1 on failure. */
const toPositiveInt = (v: unknown): number => {
  if (v === undefined || v === null) return -1;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return -1;
  const n = Number(s);
  return isNaN(n) ? -1 : Math.floor(n);
};

/**
 * Validates Step 1 of the upload_patient_report workflow.
 * patient_id is emitted directly by DynamicSelect (emit key → form data key).
 */
export const adminSelectPatientSchema = z.object({
  /** Emitted by DynamicSelect — must be a positive integer before the GET fires. */
  patient_id: z.preprocess(
    toPositiveInt,
    z
      .number()
      .int()
      .positive("Please select a patient before continuing."),
  ),
});
