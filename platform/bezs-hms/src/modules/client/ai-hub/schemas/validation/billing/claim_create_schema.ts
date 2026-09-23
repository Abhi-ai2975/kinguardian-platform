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

export const claimCreateSchema = z
  .object({
    // Session-seeded identity
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Session-seeded context IDs
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    encounter_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    condition_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="status"
    status: z.preprocess(toOptionalStr, z.string()),
    // TerminologySelect code id="use"
    use: z.preprocess(toOptionalStr, z.string()),

    // DataSelect id="provider" emits: provider_ref_id, provider_display
    provider_ref_id: z.preprocess(toOptionalStr, z.string().optional()),
    provider_display: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="service_code"
    service_code_code: z.preprocess(toOptionalStr, z.string().optional()),
    service_code_system: z.preprocess(toOptionalStr, z.string().optional()),
    service_code_display: z.preprocess(toOptionalStr, z.string().optional()),
    service_code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Service pricing fields
    unit_price_value: z.preprocess(toOptionalStr, z.string().optional()),
    unit_price_currency: z.preprocess(toOptionalStr, z.string().optional()),
    quantity_value: z.preprocess(toOptionalStr, z.string().optional()),

    // DateTimeInput fields
    billable_period_start: z.preprocess(toOptionalStr, z.string().optional()),
    billable_period_end: z.preprocess(toOptionalStr, z.string().optional()),
    created: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="coverage_id"
    coverage_id: z.preprocess(toOptionalStr, z.string().optional()),
    // TextField id="priority_code"
    priority_code: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.status,
    use: d.use,
    patient: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    billable_period_start: d.billable_period_start || undefined,
    billable_period_end: d.billable_period_end || undefined,
    created: d.created || undefined,
    provider: d.provider_ref_id
      ? `Organization/${d.provider_ref_id}`
      : undefined,
    provider_display: d.provider_display || undefined,
    priority_code: d.priority_code || undefined,
    diagnosis: d.condition_id
      ? [{ sequence: 1, diagnosis_reference: `Condition/${d.condition_id}` }]
      : undefined,
    insurance: d.coverage_id
      ? [{ sequence: 1, focal: true, coverage: `Coverage/${d.coverage_id}` }]
      : undefined,
    items:
      d.service_code_code || d.service_code_display
        ? [
            {
              sequence: 1,
              service_code: d.service_code_code || undefined,
              service_system: d.service_code_system || undefined,
              service_display: d.service_code_display || undefined,
              service_text: d.service_code_text || undefined,
              unit_price_value: d.unit_price_value
                ? Number(d.unit_price_value)
                : undefined,
              unit_price_currency: d.unit_price_currency || "USD",
              quantity_value: d.quantity_value ? Number(d.quantity_value) : 1,
              encounter: d.encounter_id
                ? `Encounter/${d.encounter_id}`
                : undefined,
            },
          ]
        : undefined,
  }));
