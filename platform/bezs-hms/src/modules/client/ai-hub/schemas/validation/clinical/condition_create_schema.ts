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

/**
 * Validates the condition creation form.
 *
 * Input is merged sessionContext + form data.
 * patient_id and encounter_id come from sessionContext.
 * Transforms into the shape expected by POST /api/fhir/v1/conditions/
 */
export const conditionCreateSchema = z
  .object({
    // Identity (seeded from session)
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Patient and encounter from sessionContext
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // Diagnosis code — CodeableConcept serverSearch
    code_code: z.preprocess(toOptionalStr, z.string().optional()),
    code_system: z.preprocess(toOptionalStr, z.string().optional()),
    code_display: z.preprocess(toOptionalStr, z.string().optional()),
    code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Clinical status — CodeableConcept select emits four fields
    clinical_status_code: z.preprocess(toOptionalStr, z.string().optional()),
    clinical_status_system: z.preprocess(toOptionalStr, z.string().optional()),
    clinical_status_display: z.preprocess(toOptionalStr, z.string().optional()),
    clinical_status_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Verification status — CodeableConcept select
    verification_status_code: z.preprocess(toOptionalStr, z.string().optional()),
    verification_status_system: z.preprocess(toOptionalStr, z.string().optional()),
    verification_status_display: z.preprocess(toOptionalStr, z.string().optional()),
    verification_status_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Severity — CodeableConcept select
    severity_code: z.preprocess(toOptionalStr, z.string().optional()),
    severity_system: z.preprocess(toOptionalStr, z.string().optional()),
    severity_display: z.preprocess(toOptionalStr, z.string().optional()),
    severity_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Category — CodeableConcept select
    category_code: z.preprocess(toOptionalStr, z.string().optional()),
    category_system: z.preprocess(toOptionalStr, z.string().optional()),
    category_display: z.preprocess(toOptionalStr, z.string().optional()),
    category_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Timeline
    onset_datetime: z.preprocess(toOptionalStr, z.string().optional()),
    recorded_date: z.preprocess(toOptionalStr, z.string().optional()),

    // Clinical notes
    note_text: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter_id: d.encounter_id,

    // Diagnosis code
    code_code: d.code_code,
    code_system: d.code_system,
    code_display: d.code_display,
    code_text: d.code_text,

    // Clinical status
    clinical_status_code: d.clinical_status_code,
    clinical_status_system: d.clinical_status_system,
    clinical_status_display: d.clinical_status_display,
    clinical_status_text: d.clinical_status_text,

    // Verification status
    verification_status_code: d.verification_status_code,
    verification_status_system: d.verification_status_system,
    verification_status_display: d.verification_status_display,
    verification_status_text: d.verification_status_text,

    // Severity
    severity_code: d.severity_code,
    severity_system: d.severity_system,
    severity_display: d.severity_display,
    severity_text: d.severity_text,

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

    onset_datetime: d.onset_datetime,
    recorded_date: d.recorded_date,

    // Note as list
    note: d.note_text ? [{ text: d.note_text }] : undefined,
  }));
