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

const toOptionalNum = (v: unknown): number | undefined => {
  if (!v || String(v) === "" || String(v) === "undefined" || String(v) === "null")
    return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
};

/**
 * Validates the observation creation form.
 *
 * Input is merged sessionContext + form data.
 * patient_id and encounter_id come from sessionContext.
 * Transforms into the shape expected by POST /api/fhir/v1/observations/
 */
export const observationCreateSchema = z
  .object({
    // Identity (seeded from session)
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Patient and encounter from sessionContext
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // Observation code — CodeableConcept serverSearch (LOINC)
    code_code: z.preprocess(toOptionalStr, z.string().optional()),
    code_system: z.preprocess(toOptionalStr, z.string().optional()),
    code_display: z.preprocess(toOptionalStr, z.string().optional()),
    code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Status — code-only select (required)
    status: z.preprocess(toOptionalStr, z.string().min(1, "Status is required")),

    // Category — CodeableConcept select
    category_code: z.preprocess(toOptionalStr, z.string().optional()),
    category_system: z.preprocess(toOptionalStr, z.string().optional()),
    category_display: z.preprocess(toOptionalStr, z.string().optional()),
    category_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Value
    value_quantity: z.preprocess(toOptionalNum, z.number().optional()),
    value_quantity_unit: z.preprocess(toOptionalStr, z.string().optional()),
    value_quantity_system: z.preprocess(toOptionalStr, z.string().optional()),
    value_quantity_code: z.preprocess(toOptionalStr, z.string().optional()),
    value_string: z.preprocess(toOptionalStr, z.string().optional()),

    // Interpretation — code-only select
    interpretation: z.preprocess(toOptionalStr, z.string().optional()),

    // Performer — DataSelect emits performer_ref_id
    performer_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // Timing
    effective_datetime: z.preprocess(toOptionalStr, z.string().optional()),
    issued: z.preprocess(toOptionalStr, z.string().optional()),

    // Note
    note: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter_id: d.encounter_id,

    // Observation code
    code_code: d.code_code,
    code_system: d.code_system,
    code_display: d.code_display,
    code_text: d.code_text,

    status: d.status,

    // Category as list
    category: d.category_code
      ? [
          {
            coding_system: d.category_system,
            coding_code: d.category_code,
            coding_display: d.category_display,
            text: d.category_text,
          },
        ]
      : undefined,

    value_quantity: d.value_quantity,
    value_quantity_unit: d.value_quantity_unit,
    value_quantity_system: d.value_quantity_system,
    value_quantity_code: d.value_quantity_code,
    value_string: d.value_string,

    // Interpretation — hardcode system since code-only select
    interpretation_code: d.interpretation,
    interpretation_system: d.interpretation
      ? "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation"
      : undefined,

    performer: d.performer_ref_id ? `Practitioner/${d.performer_ref_id}` : undefined,

    effective_datetime: d.effective_datetime,
    issued: d.issued,
    note: d.note,
  }));
