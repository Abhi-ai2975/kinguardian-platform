/**
 * select_appointment_schema.ts
 *
 * Layer: client / ai-hub / schemas / validation / clinical
 *
 * Validates Step 1 of the add_consultation_extractions workflow.
 * The action for this step is a GET to /encounters/?appointment_id=...
 * This schema validates that the user has selected an appointment before
 * the URL is resolved and the GET fires. No request body is sent.
 *
 * The schema receives { ...sessionContext, ...cleaned } where:
 *   appointment_id — emitted as a hidden input by the DynamicSelect component
 *   patient_id     — emitted as a hidden input by the DynamicSelect component
 */

import { z } from "zod";

/** Coerces a string integer (including emitted form values) to a positive number. */
const toPositiveInt = (v: unknown): number => {
  if (v === undefined || v === null) return -1;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return -1;
  const n = Number(s);
  return isNaN(n) ? -1 : Math.floor(n);
};

export const selectAppointmentSchema = z.object({
  /** Emitted by DynamicSelect — must be a positive integer before the GET fires. */
  appointment_id: z.preprocess(
    toPositiveInt,
    z
      .number()
      .int()
      .positive("Please select an appointment before continuing."),
  ),
});
