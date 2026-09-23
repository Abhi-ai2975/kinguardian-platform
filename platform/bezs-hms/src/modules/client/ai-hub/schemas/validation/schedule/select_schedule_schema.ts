/**
 * select_schedule_schema.ts
 *
 * Layer: client / ai-hub / schemas / validation / schedule
 *
 * Validates the Step 1 "Select Schedule" form in the generate_slots workflow.
 * The action for this step is a GET — the schema validates that a schedule has
 * been selected before the URL is resolved and the GET fires. No body is sent.
 *
 * The schema receives { ...sessionContext, ...cleaned } where:
 *   schedule_id — emitted as a hidden input by the DynamicSelect component
 */

import { z } from "zod";

/** Coerces a string integer (including emitted form values) to a number. */
const toPositiveInt = (v: unknown): number => {
  if (v === undefined || v === null) return -1;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return -1;
  const n = Number(s);
  return isNaN(n) ? -1 : Math.floor(n);
};

export const selectScheduleSchema = z.object({
  /** Emitted by the DynamicSelect — must be a positive integer before the GET fires. */
  schedule_id: z.preprocess(
    toPositiveInt,
    z.number().int().positive("Please select a schedule before continuing."),
  ),
});
