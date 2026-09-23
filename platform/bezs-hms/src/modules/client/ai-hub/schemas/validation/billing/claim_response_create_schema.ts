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

export const claimResponseCreateSchema = z
  .object({
    // Session-seeded identity
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Session/workflow-seeded context IDs
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    claim_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="cr_status"
    cr_status: z.preprocess(toOptionalStr, z.string()),
    // TerminologySelect code id="use"
    use: z.preprocess(toOptionalStr, z.string()),
    // TerminologySelect code id="outcome"
    outcome: z.preprocess(toOptionalStr, z.string()),

    // DataSelect id="insurer" emits: insurer_ref_id, insurer_display
    insurer_ref_id: z.preprocess(toOptionalStr, z.string().optional()),
    insurer_display: z.preprocess(toOptionalStr, z.string().optional()),

    // Payment fields
    payment_amount: z.preprocess(toOptionalStr, z.string().optional()),
    payment_currency: z.preprocess(toOptionalStr, z.string().optional()),

    // DateTimeInput id="cr_created"
    cr_created: z.preprocess(toOptionalStr, z.string().optional()),

    // TextField id="disposition"
    disposition: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.cr_status,
    use: d.use,
    outcome: d.outcome,
    patient: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    request: d.claim_id ? `Claim/${d.claim_id}` : undefined,
    insurer: d.insurer_ref_id
      ? `Organization/${d.insurer_ref_id}`
      : undefined,
    insurer_display: d.insurer_display || undefined,
    created: d.cr_created || undefined,
    disposition: d.disposition || undefined,
    totals: d.payment_amount
      ? [
          {
            category_code: "benefit",
            amount_value: Number(d.payment_amount),
            amount_currency: d.payment_currency || "USD",
          },
        ]
      : undefined,
  }));
