import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

const toOptionalInt = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : Math.floor(n);
};

/** Coerce a value to an optional number (int or float). */
const toOptionalNum = (v: unknown): number | undefined => {
  if (!v || String(v) === "" || String(v) === "undefined" || String(v) === "null")
    return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
};

/**
 * Validates the vitals creation form.
 *
 * NOTE: This endpoint accepts patient_id as an integer directly (not a FHIR reference string).
 * All measurement fields are optional.
 */
export const vitalsCreateSchema = z
  .object({
    // Identity (seeded from session)
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Patient from sessionContext (integer, not reference string)
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // Core vitals
    heart_rate: z.preprocess(toOptionalNum, z.number().optional()),
    resting_heart_rate: z.preprocess(toOptionalNum, z.number().optional()),
    blood_pressure_systolic: z.preprocess(toOptionalNum, z.number().optional()),
    blood_pressure_diastolic: z.preprocess(toOptionalNum, z.number().optional()),
    weight_kg: z.preprocess(toOptionalNum, z.number().optional()),
    height_cm: z.preprocess(toOptionalNum, z.number().optional()),
    oxygen_saturation_percentage: z.preprocess(toOptionalNum, z.number().optional()),

    // Additional measurements
    respiratory_rate: z.preprocess(toOptionalNum, z.number().optional()),
    body_temperature_celsius: z.preprocess(toOptionalNum, z.number().optional()),
    blood_glucose_mmol_l: z.preprocess(toOptionalNum, z.number().optional()),

    // Activity
    steps: z.preprocess(toOptionalNum, z.number().optional()),
    sleep_minutes: z.preprocess(toOptionalNum, z.number().optional()),
    calories_kcal: z.preprocess(toOptionalNum, z.number().optional()),

    // Timestamps
    recorded_at: z.preprocess(toOptionalStr, z.string().optional()),
    date: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    // patient_id is passed as integer directly
    patient_id: d.patient_id,

    heart_rate: d.heart_rate !== undefined ? Math.floor(d.heart_rate) : undefined,
    resting_heart_rate:
      d.resting_heart_rate !== undefined ? Math.floor(d.resting_heart_rate) : undefined,
    blood_pressure_systolic:
      d.blood_pressure_systolic !== undefined ? Math.floor(d.blood_pressure_systolic) : undefined,
    blood_pressure_diastolic:
      d.blood_pressure_diastolic !== undefined ? Math.floor(d.blood_pressure_diastolic) : undefined,
    weight_kg: d.weight_kg,
    height_cm: d.height_cm,
    oxygen_saturation_percentage: d.oxygen_saturation_percentage,
    respiratory_rate: d.respiratory_rate,
    body_temperature_celsius: d.body_temperature_celsius,
    blood_glucose_mmol_l: d.blood_glucose_mmol_l,
    steps: d.steps !== undefined ? Math.floor(d.steps) : undefined,
    sleep_minutes: d.sleep_minutes !== undefined ? Math.floor(d.sleep_minutes) : undefined,
    calories_kcal: d.calories_kcal,
    recorded_at: d.recorded_at,
    date: d.date,
  }));
