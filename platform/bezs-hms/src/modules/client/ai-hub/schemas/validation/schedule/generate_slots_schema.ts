/**
 * generate_slots_schema.ts
 *
 * Layer: client / ai-hub / schemas / validation / schedule
 *
 * Zod validation + transform for the "Configure Slot Generation" step in the
 * generate_slots workflow. This schema is used for the POST /slots/generate action.
 *
 * Field sources (schema receives { ...sessionContext, ...cleaned }):
 *   schedule_id            — from sessionContext (set by step 1 DynamicSelect emit + GET response)
 *   user_id / org_id       — from sessionContext (seeded at session start)
 *   generation_start       — DatePicker (YYYY-MM-DD); appended to T00:00:00 if no time given
 *   generation_end         — DatePicker (YYYY-MM-DD); appended to T23:59:59 if no time given
 *   slot_duration_minutes  — TextField (number string)
 *   appointment_type_*     — TerminologySelect CodeableConcept (optional; set at booking time if omitted)
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Preprocessors
// ---------------------------------------------------------------------------

/** Coerces empty / null / "null" / "undefined" strings to undefined. */
const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

/** Coerces a string integer to a number; returns -1 for invalid values. */
const toPositiveInt = (v: unknown): number => {
  if (v === undefined || v === null) return -1;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return -1;
  const n = Number(s);
  return isNaN(n) ? -1 : Math.floor(n);
};

/**
 * Converts a DatePicker date value (YYYY-MM-DD) to a start-of-day ISO datetime.
 * If the value already includes a time component (contains "T") it is passed through.
 */
const toDatetimeStart = (v: unknown): string => {
  const s = toOptionalStr(v);
  if (!s) return "";
  return s.includes("T") ? s : `${s}T00:00:00`;
};

/**
 * Converts a DatePicker date value (YYYY-MM-DD) to an end-of-day ISO datetime.
 * If the value already includes a time component (contains "T") it is passed through.
 */
const toDatetimeEnd = (v: unknown): string => {
  const s = toOptionalStr(v);
  if (!s) return "";
  return s.includes("T") ? s : `${s}T23:59:59`;
};

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

export const generateSlotsSchema = z
  .object({
    /** Session-seeded tenant fields. */
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    /** Carried forward from step 1 via sessionContext. */
    schedule_id: z.preprocess(
      toPositiveInt,
      z.number().int().positive("Schedule ID missing — complete step 1 first."),
    ),

    /**
     * DatePicker outputs "YYYY-MM-DD"; toDatetimeStart appends "T00:00:00"
     * so the backend receives a valid datetime string.
     */
    generation_start: z.preprocess(
      toDatetimeStart,
      z.string().min(1, "Start date is required."),
    ),

    /**
     * DatePicker outputs "YYYY-MM-DD"; toDatetimeEnd appends "T23:59:59"
     * so the full end day is included in the generation window.
     */
    generation_end: z.preprocess(
      toDatetimeEnd,
      z.string().min(1, "End date is required."),
    ),

    /** TextField (shortText); coerced from string to integer. */
    slot_duration_minutes: z.preprocess(
      toPositiveInt,
      z
        .number()
        .int()
        .min(1, "Slot duration must be at least 1 minute.")
        .max(1440, "Slot duration cannot exceed 1440 minutes (24 hours)."),
    ),

    // TerminologySelect (CodeableConcept), id="appointment_type" — all optional.
    // The FHIR convention is to set appointmentType on the Appointment at booking
    // time, not on the Slot at generation time. Pre-set here only when every slot
    // in this batch shares the same type (e.g. a dedicated ROUTINE session).
    appointment_type_code: z.preprocess(toOptionalStr, z.string().optional()),
    appointment_type_system: z.preprocess(toOptionalStr, z.string().optional()),
    appointment_type_display: z.preprocess(toOptionalStr, z.string().optional()),
    appointment_type_text: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    schedule_id: d.schedule_id,
    generation_start: d.generation_start,
    generation_end: d.generation_end,
    slot_duration_minutes: d.slot_duration_minutes,
    appointment_type_code: d.appointment_type_code || undefined,
    appointment_type_system: d.appointment_type_system || undefined,
    appointment_type_display: d.appointment_type_display || undefined,
    appointment_type_text: d.appointment_type_text || undefined,
  }));
