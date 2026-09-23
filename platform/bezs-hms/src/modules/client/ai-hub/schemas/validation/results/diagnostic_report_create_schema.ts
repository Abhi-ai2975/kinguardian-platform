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

export const diagnosticReportCreateSchema = z
  .object({
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Auto-resolved from session
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    specimen_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="status" (required)
    status: z.preprocess(toOptionalStr, z.string().min(1, "Diagnostic report status is required")),

    // TerminologySelect CodeableConcept id="code"
    code_code: z.preprocess(toOptionalStr, z.string().optional()),
    code_system: z.preprocess(toOptionalStr, z.string().optional()),
    code_display: z.preprocess(toOptionalStr, z.string().optional()),
    code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="category"
    category_code: z.preprocess(toOptionalStr, z.string().optional()),
    category_system: z.preprocess(toOptionalStr, z.string().optional()),
    category_display: z.preprocess(toOptionalStr, z.string().optional()),
    category_text: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="performer" emits performer_ref_id
    performer_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // DateTimeInput id="effective_datetime"
    effective_datetime: z.preprocess(toOptionalStr, z.string().optional()),

    // DateTimeInput id="issued"
    issued: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="conclusion"
    conclusion: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.status,
    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter_id: d.encounter_id,
    specimen_id: d.specimen_id,
    code_code: d.code_code || undefined,
    code_system: d.code_system || undefined,
    code_display: d.code_display || undefined,
    code_text: d.code_text || undefined,
    category: d.category_code
      ? [
          {
            coding_system: d.category_system || undefined,
            coding_code: d.category_code,
            coding_display: d.category_display || undefined,
            text: d.category_text || undefined,
          },
        ]
      : undefined,
    performer: d.performer_ref_id
      ? [{ reference: `Practitioner/${d.performer_ref_id}` }]
      : undefined,
    effective_datetime: d.effective_datetime || undefined,
    issued: d.issued || undefined,
    conclusion: d.conclusion || undefined,
  }));
