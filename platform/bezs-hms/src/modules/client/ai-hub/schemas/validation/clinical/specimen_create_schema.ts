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

export const specimenCreateSchema = z
  .object({
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Auto-resolved from session
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="status" (required)
    status: z.preprocess(toOptionalStr, z.string().min(1, "Specimen status is required")),

    // TerminologySelect CodeableConcept id="type"
    type_code: z.preprocess(toOptionalStr, z.string().optional()),
    type_system: z.preprocess(toOptionalStr, z.string().optional()),
    type_display: z.preprocess(toOptionalStr, z.string().optional()),
    type_text: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="accession_identifier_value"
    accession_identifier_value: z.preprocess(toOptionalStr, z.string().optional()),

    // DateTimeInput id="received_time"
    received_time: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="collector" emits collector_ref_id
    collector_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // DateTimeInput id="collected_datetime"
    collected_datetime: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="quantity_value"
    quantity_value: z.preprocess(toOptionalFloat, z.number().positive().optional()),

    // TextField id="quantity_unit"
    quantity_unit: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="body_site"
    body_site_code: z.preprocess(toOptionalStr, z.string().optional()),
    body_site_system: z.preprocess(toOptionalStr, z.string().optional()),
    body_site_display: z.preprocess(toOptionalStr, z.string().optional()),
    body_site_text: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.status,
    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    type_code: d.type_code || undefined,
    type_system: d.type_system || undefined,
    type_display: d.type_display || undefined,
    type_text: d.type_text || undefined,
    accession_identifier_value: d.accession_identifier_value || undefined,
    received_time: d.received_time || undefined,
    collection:
      d.collector_ref_id ||
      d.collected_datetime ||
      d.quantity_value !== undefined ||
      d.quantity_unit ||
      d.body_site_code
        ? {
            collector: d.collector_ref_id
              ? `Practitioner/${d.collector_ref_id}`
              : undefined,
            collected_datetime: d.collected_datetime || undefined,
            quantity_value: d.quantity_value,
            quantity_unit: d.quantity_unit || undefined,
            body_site_code: d.body_site_code || undefined,
            body_site_system: d.body_site_system || undefined,
            body_site_display: d.body_site_display || undefined,
          }
        : undefined,
  }));
