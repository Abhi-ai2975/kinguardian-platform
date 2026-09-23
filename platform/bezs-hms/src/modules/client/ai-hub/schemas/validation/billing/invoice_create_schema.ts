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

export const invoiceCreateSchema = z
  .object({
    // Session-seeded identity
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Session-seeded context IDs
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="status"
    status: z.preprocess(toOptionalStr, z.string()),

    // DateTimeInput id="date"
    date: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="issuer" emits: issuer_ref_id, issuer_display
    issuer_ref_id: z.preprocess(toOptionalStr, z.string().optional()),
    issuer_display: z.preprocess(toOptionalStr, z.string().optional()),

    // Amount fields
    total_gross_value: z.preprocess(toOptionalStr, z.string().optional()),
    total_net_value: z.preprocess(toOptionalStr, z.string().optional()),
    currency: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect CodeableConcept id="item_code"
    item_code_code: z.preprocess(toOptionalStr, z.string().optional()),
    item_code_system: z.preprocess(toOptionalStr, z.string().optional()),
    item_code_display: z.preprocess(toOptionalStr, z.string().optional()),
    item_code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Line item amount
    item_amount: z.preprocess(toOptionalStr, z.string().optional()),
    item_currency: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    status: d.status,
    subject: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    date: d.date || undefined,
    issuer: d.issuer_ref_id
      ? `Organization/${d.issuer_ref_id}`
      : undefined,
    issuer_display: d.issuer_display || undefined,
    total_gross_value: d.total_gross_value
      ? Number(d.total_gross_value)
      : undefined,
    total_gross_currency: d.currency || "USD",
    total_net_value: d.total_net_value
      ? Number(d.total_net_value)
      : undefined,
    total_net_currency: d.currency || "USD",
    line_items:
      d.item_code_code || d.item_amount
        ? [
            {
              sequence: 1,
              chargeitem_cc_code: d.item_code_code || undefined,
              chargeitem_cc_system: d.item_code_system || undefined,
              chargeitem_cc_display: d.item_code_display || undefined,
              chargeitem_cc_text: d.item_code_text || undefined,
              price_components: [
                {
                  type: "base",
                  amount_value: d.item_amount
                    ? Number(d.item_amount)
                    : undefined,
                  amount_currency: d.item_currency || "USD",
                },
              ],
            },
          ]
        : undefined,
  }));
