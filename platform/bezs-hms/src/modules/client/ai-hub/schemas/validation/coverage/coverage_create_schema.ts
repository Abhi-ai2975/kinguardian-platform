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

export const coverageCreateSchema = z
  .object({
    user_id: z.preprocess(toOptionalStr, z.string()),
    org_id: z.preprocess(toOptionalStr, z.string()),

    // Status is required
    status: z.preprocess(toOptionalStr, z.string().min(1, "Status is required")),

    // Auto-resolved patient
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // Subscriber member ID
    subscriber_id_value: z.preprocess(toOptionalStr, z.string().optional()),

    // Network
    network: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="coverage_type"
    coverage_type_code: z.preprocess(toOptionalStr, z.string().optional()),
    coverage_type_system: z.preprocess(toOptionalStr, z.string().optional()),
    coverage_type_display: z.preprocess(toOptionalStr, z.string().optional()),
    coverage_type_text: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="payor" emits key="ref_id" → payor_ref_id
    payor_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    payor_display: z.preprocess(toOptionalStr, z.string().optional()),

    // Period
    period_start: z.preprocess(toOptionalStr, z.string().optional()),
    period_end: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.status,

    beneficiary: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    subscriber_id_value: d.subscriber_id_value || undefined,
    network: d.network || undefined,

    type_code: d.coverage_type_code || undefined,
    type_system: d.coverage_type_system || undefined,
    type_display: d.coverage_type_display || undefined,
    type_text: d.coverage_type_text || undefined,

    payor: d.payor_ref_id
      ? [
          {
            reference: `Organization/${d.payor_ref_id}`,
            reference_display: d.payor_display || undefined,
          },
        ]
      : undefined,

    period_start: d.period_start || undefined,
    period_end: d.period_end || undefined,
  }));
