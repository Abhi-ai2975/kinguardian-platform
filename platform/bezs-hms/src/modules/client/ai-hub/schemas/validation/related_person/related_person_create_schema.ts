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

export const relatedPersonCreateSchema = z
  .object({
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Auto-resolved from session
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    active: z.boolean().optional(),

    // TerminologySelect CodeableConcept id="relationship"
    relationship_code: z.preprocess(toOptionalStr, z.string().optional()),
    relationship_system: z.preprocess(toOptionalStr, z.string().optional()),
    relationship_display: z.preprocess(toOptionalStr, z.string().optional()),
    relationship_text: z.preprocess(toOptionalStr, z.string().optional()),

    relationship_description: z.preprocess(toOptionalStr, z.string().optional()),

    // Name fields
    family_name: z.preprocess(toOptionalStr, z.string().optional()),
    given_name: z.preprocess(toOptionalStr, z.string().optional()),
    name_prefix: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect code id="name_use"
    name_use: z.preprocess(toOptionalStr, z.string().optional()),

    // Contact
    phone: z.preprocess(toOptionalStr, z.string().optional()),
    email: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect code id="gender"
    gender: z.preprocess(toOptionalStr, z.string().optional()),

    // Dates
    birth_date: z.preprocess(toOptionalStr, z.string().optional()),
    period_start: z.preprocess(toOptionalStr, z.string().optional()),
    period_end: z.preprocess(toOptionalStr, z.string().optional()),

    // Address
    address_text: z.preprocess(toOptionalStr, z.string().optional()),
    city: z.preprocess(toOptionalStr, z.string().optional()),
    state: z.preprocess(toOptionalStr, z.string().optional()),
    postal_code: z.preprocess(toOptionalStr, z.string().optional()),
    country: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => {
    const telecom: Array<{ system: string; value: string; use?: string }> = [];
    if (d.phone) telecom.push({ system: "phone", value: d.phone, use: "mobile" });
    if (d.email) telecom.push({ system: "email", value: d.email });

    const hasAddress = d.city || d.state || d.postal_code || d.country || d.address_text;

    return {
      user_id: d.user_id,
      org_id: d.org_id,
      patient: d.patient_id ? `Patient/${d.patient_id}` : undefined,
      active: d.active ?? true,

      relationship: d.relationship_code
        ? [
            {
              coding_system: d.relationship_system,
              coding_code: d.relationship_code,
              coding_display: d.relationship_display,
              text: d.relationship_text || d.relationship_description,
            },
          ]
        : undefined,

      name:
        d.family_name || d.given_name
          ? [
              {
                use: d.name_use || undefined,
                family: d.family_name || undefined,
                given: d.given_name ? [d.given_name] : undefined,
                prefix: d.name_prefix ? [d.name_prefix] : undefined,
              },
            ]
          : undefined,

      telecom: telecom.length > 0 ? telecom : undefined,

      gender: d.gender || undefined,
      birth_date: d.birth_date || undefined,
      period_start: d.period_start || undefined,
      period_end: d.period_end || undefined,

      address: hasAddress
        ? [
            {
              text: d.address_text || undefined,
              line: d.address_text ? [d.address_text] : undefined,
              city: d.city || undefined,
              state: d.state || undefined,
              postal_code: d.postal_code || undefined,
              country: d.country || undefined,
            },
          ]
        : undefined,
    };
  });
