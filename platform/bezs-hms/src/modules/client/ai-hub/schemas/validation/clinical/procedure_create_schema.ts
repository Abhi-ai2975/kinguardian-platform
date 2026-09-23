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

export const procedureCreateSchema = z
  .object({
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Auto-resolved from session
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="status" (required)
    status: z.preprocess(toOptionalStr, z.string().min(1, "Procedure status is required")),

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

    // TerminologySelect CodeableConcept id="outcome"
    outcome_code: z.preprocess(toOptionalStr, z.string().optional()),
    outcome_system: z.preprocess(toOptionalStr, z.string().optional()),
    outcome_display: z.preprocess(toOptionalStr, z.string().optional()),
    outcome_text: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="performer" emits performer_ref_id
    performer_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // DataSelect id="location" emits location_ref_id (integer FK)
    location_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // DateTimeInput id="performed_datetime"
    performed_datetime: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="note_text"
    note_text: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.status,
    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter_id: d.encounter_id,
    code_code: d.code_code || undefined,
    code_system: d.code_system || undefined,
    code_display: d.code_display || undefined,
    code_text: d.code_text || undefined,
    category_code: d.category_code || undefined,
    category_system: d.category_system || undefined,
    category_display: d.category_display || undefined,
    category_text: d.category_text || undefined,
    outcome_code: d.outcome_code || undefined,
    outcome_system: d.outcome_system || undefined,
    outcome_display: d.outcome_display || undefined,
    outcome_text: d.outcome_text || undefined,
    performer: d.performer_ref_id
      ? [{ actor: `Practitioner/${d.performer_ref_id}` }]
      : undefined,
    location_id: d.location_ref_id,
    performed_datetime: d.performed_datetime || undefined,
    note: d.note_text ? [{ text: d.note_text }] : undefined,
  }));
