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

export const carePlanCreateSchema = z
  .object({
    // Session-seeded identity — required by FHIR server
    user_id: z.preprocess(toOptionalStr, z.string()),
    org_id: z.preprocess(toOptionalStr, z.string()),

    // Session-seeded context IDs
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    condition_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="status"
    status: z.preprocess(toOptionalStr, z.string()),
    // TerminologySelect code id="intent"
    intent: z.preprocess(toOptionalStr, z.string()),

    title: z.preprocess(toOptionalStr, z.string().optional()),
    description: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="category"
    category_code: z.preprocess(toOptionalStr, z.string().optional()),
    category_system: z.preprocess(toOptionalStr, z.string().optional()),
    category_display: z.preprocess(toOptionalStr, z.string().optional()),
    category_text: z.preprocess(toOptionalStr, z.string().optional()),

    // DateTimeInput id="period_start" / "period_end"
    period_start: z.preprocess(toOptionalStr, z.string().optional()),
    period_end: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="author" emits: author_ref_id, author_display
    author_ref_id: z.preprocess(toOptionalStr, z.string().optional()),
    author_display: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="note_text"
    note_text: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.status,
    intent: d.intent,
    title: d.title || undefined,
    description: d.description || undefined,
    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter: d.encounter_id ? `Encounter/${d.encounter_id}` : undefined,
    period_start: d.period_start || undefined,
    period_end: d.period_end || undefined,
    author: d.author_ref_id ? `Practitioner/${d.author_ref_id}` : undefined,
    author_display: d.author_display || undefined,
    categories: d.category_code
      ? [
          {
            coding_system: d.category_system || undefined,
            coding_code: d.category_code,
            coding_display: d.category_display || undefined,
            text: d.category_text || undefined,
          },
        ]
      : undefined,
    addresses: d.condition_id
      ? [{ reference: `Condition/${d.condition_id}` }]
      : undefined,
    notes: d.note_text ? [{ text: d.note_text }] : undefined,
  }));
