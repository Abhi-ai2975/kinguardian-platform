import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

export const medicationCreateSchema = z
  .object({
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="code" → emits code_code, code_system, code_display, code_text
    code_code: z.preprocess(toOptionalStr, z.string().optional()),
    code_system: z.preprocess(toOptionalStr, z.string().optional()),
    code_display: z.preprocess(toOptionalStr, z.string().optional()),
    code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect code id="status"
    status: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="form" → emits form_code, form_system, form_display, form_text
    form_code: z.preprocess(toOptionalStr, z.string().optional()),
    form_system: z.preprocess(toOptionalStr, z.string().optional()),
    form_display: z.preprocess(toOptionalStr, z.string().optional()),
    form_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Batch
    batch_lot_number: z.preprocess(toOptionalStr, z.string().optional()),
    batch_expiration_date: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    code: d.code_code || undefined,
    code_system: d.code_system || undefined,
    code_display: d.code_display || undefined,
    code_text: d.code_text || undefined,

    status: d.status || undefined,

    form_code: d.form_code || undefined,
    form_system: d.form_system || undefined,
    form_display: d.form_display || undefined,
    form_text: d.form_text || undefined,

    batch_lot_number: d.batch_lot_number || undefined,
    batch_expiration_date: d.batch_expiration_date || undefined,
  }));
