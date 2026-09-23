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

export const documentReferenceCreateSchema = z
  .object({
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Auto-resolved from session
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="status" (required)
    status: z.preprocess(toOptionalStr, z.string().min(1, "Document reference status is required")),

    // TerminologySelect code id="doc_status"
    doc_status: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="doc_type"
    doc_type_code: z.preprocess(toOptionalStr, z.string().optional()),
    doc_type_system: z.preprocess(toOptionalStr, z.string().optional()),
    doc_type_display: z.preprocess(toOptionalStr, z.string().optional()),
    doc_type_text: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="author" emits author_ref_id
    author_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // DateTimeInput id="date"
    date: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="description"
    description: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="attachment_url" (required for content)
    attachment_url: z.preprocess(toOptionalStr, z.string().min(1, "Document URL is required")),

    // TextField id="attachment_content_type"
    attachment_content_type: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="attachment_title"
    attachment_title: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.status,
    doc_status: d.doc_status || undefined,
    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    type_code: d.doc_type_code || undefined,
    type_system: d.doc_type_system || undefined,
    type_display: d.doc_type_display || undefined,
    type_text: d.doc_type_text || undefined,
    authors: d.author_ref_id
      ? [{ reference: `Practitioner/${d.author_ref_id}` }]
      : undefined,
    date: d.date || undefined,
    description: d.description || undefined,
    content: [
      {
        attachment_url: d.attachment_url,
        attachment_content_type: d.attachment_content_type || undefined,
        attachment_title: d.attachment_title || undefined,
      },
    ],
  }));
