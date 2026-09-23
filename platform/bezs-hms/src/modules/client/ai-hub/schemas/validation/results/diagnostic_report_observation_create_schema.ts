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

const toOptionalFloat = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
};

// Receives merged { ...sessionContext, ...formData }
// diagnostic_report_id and specimen_id come from sessionContext (workflow outputs)
export const diagnosticReportObservationCreateSchema = z
  .object({
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // From sessionContext (workflow step 1 outputs)
    diagnostic_report_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    specimen_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // Auto-resolved from session
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="status" (required)
    status: z.preprocess(toOptionalStr, z.string().min(1, "Observation status is required")),

    // TerminologySelect CodeableConcept id="code"
    code_code: z.preprocess(toOptionalStr, z.string().optional()),
    code_system: z.preprocess(toOptionalStr, z.string().optional()),
    code_display: z.preprocess(toOptionalStr, z.string().optional()),
    code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="value_quantity"
    value_quantity: z.preprocess(toOptionalFloat, z.number().optional()),

    // TextField id="value_quantity_unit"
    value_quantity_unit: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="value_string"
    value_string: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="reference_range_low"
    reference_range_low: z.preprocess(toOptionalFloat, z.number().optional()),

    // TextField id="reference_range_high"
    reference_range_high: z.preprocess(toOptionalFloat, z.number().optional()),

    // TerminologySelect code id="interpretation"
    interpretation: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.status,
    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter_id: d.encounter_id,
    diagnostic_report_id: d.diagnostic_report_id,
    specimen_id: d.specimen_id,
    code_code: d.code_code || undefined,
    code_system: d.code_system || undefined,
    code_display: d.code_display || undefined,
    code_text: d.code_text || undefined,
    value_quantity: d.value_quantity,
    value_quantity_unit: d.value_quantity_unit || undefined,
    value_string: d.value_string || undefined,
    reference_range_low: d.reference_range_low,
    reference_range_high: d.reference_range_high,
    interpretation_code: d.interpretation || undefined,
    interpretation_system: d.interpretation
      ? "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation"
      : undefined,
    category: [
      {
        coding_system: "http://terminology.hl7.org/CodeSystem/observation-category",
        coding_code: "laboratory",
      },
    ],
  }));
