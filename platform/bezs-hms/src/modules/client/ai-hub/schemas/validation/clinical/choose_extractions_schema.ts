/**
 * Validation schema for the "Choose Extractions" step in the
 * add_consultation_extractions workflow.
 *
 * Layer: client / ai-hub / schemas / validation / clinical
 *
 * Validates that an encounter is in session context (from step 1's required_outputs)
 * and that the practitioner has selected at least one extraction type to add.
 * The checkbox values (add_condition, add_observation, add_medication_request,
 * add_service_request) are merged from sessionContext and cleaned form data by
 * the submit route before validation runs.
 */

import { z } from "zod";

const toOptionalInt = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : Math.floor(n);
};

/** @throws When encounter_id is absent or no extraction type is selected. */
export const chooseExtractionsSchema = z
  .object({
    // encounter_id must be present (resolved from step 0 via required_outputs)
    encounter_id: z.preprocess(
      toOptionalInt,
      z
        .number()
        .int()
        .positive("Encounter not found. Please go back and select a valid appointment."),
    ),

    // Checkbox values emitted by form.tsx — true if checked, false if unchecked
    add_condition: z.boolean().optional().default(false),
    add_observation: z.boolean().optional().default(false),
    add_medication_request: z.boolean().optional().default(false),
    add_service_request: z.boolean().optional().default(false),
  })
  .refine(
    (d) =>
      d.add_condition ||
      d.add_observation ||
      d.add_medication_request ||
      d.add_service_request,
    {
      message:
        "Please select at least one type of clinical extraction to add (Condition, Observation, Medication, or Service Request).",
    },
  );
