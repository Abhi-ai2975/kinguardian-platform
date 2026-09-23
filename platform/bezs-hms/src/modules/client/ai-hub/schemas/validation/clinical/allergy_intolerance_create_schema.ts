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
 * Validates the allergy/intolerance creation form.
 *
 * Input is merged sessionContext + form data.
 * patient_id and encounter_id come from sessionContext.
 * Transforms into the shape expected by POST /api/fhir/v1/allergy-intolerances/
 */
export const allergyIntoleranceCreateSchema = z
  .object({
    // Identity (seeded from session)
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Patient and encounter from sessionContext
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // Allergy code — CodeableConcept serverSearch emits four fields
    code_code: z.preprocess(toOptionalStr, z.string().optional()),
    code_system: z.preprocess(toOptionalStr, z.string().optional()),
    code_display: z.preprocess(toOptionalStr, z.string().optional()),
    code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Classification — code-only selects
    clinical_status: z.preprocess(toOptionalStr, z.string().optional()),
    verification_status: z.preprocess(toOptionalStr, z.string().optional()),
    criticality: z.preprocess(toOptionalStr, z.string().optional()),

    // Type and category (free-text fields)
    type: z.preprocess(toOptionalStr, z.string().optional()),
    category: z.preprocess(toOptionalStr, z.string().optional()),

    // Timeline
    onset_date_time: z.preprocess(toOptionalStr, z.string().optional()),
    recorded_date: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    patient: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter: d.encounter_id ? `Encounter/${d.encounter_id}` : undefined,

    // Allergy code
    code_code: d.code_code,
    code_system: d.code_system,
    code_display: d.code_display,
    code_text: d.code_text,

    // Clinical status — hardcode system since code-only select
    clinical_status_code: d.clinical_status,
    clinical_status_system: d.clinical_status
      ? "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical"
      : undefined,

    // Verification status
    verification_status_code: d.verification_status,
    verification_status_system: d.verification_status
      ? "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification"
      : undefined,

    criticality: d.criticality,
    type: d.type,

    // Split comma-separated category string into list
    categories: d.category
      ? d.category
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,

    onset_date_time: d.onset_date_time,
    recorded_date: d.recorded_date,
  }));
