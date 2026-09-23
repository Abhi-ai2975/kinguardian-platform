import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

export const organizationCreateSchema = z
  .object({
    // Seeded from Better Auth session by route.ts
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    name: z.preprocess(toOptionalStr, z.string().min(1, "Organisation name is required")),
    active: z.boolean().optional(),

    // Parent organisation (partOf)
    partof: z.preprocess(toOptionalStr, z.string().optional()),
    partof_display: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect id="org_type" valueType="CodeableConcept"
    org_type_code: z.preprocess(toOptionalStr, z.string().optional()),
    org_type_system: z.preprocess(toOptionalStr, z.string().optional()),
    org_type_display: z.preprocess(toOptionalStr, z.string().optional()),
    org_type_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Single alias TextField
    alias_value: z.preprocess(toOptionalStr, z.string().optional()),

    // Single telecom entry
    telecom_system: z.preprocess(toOptionalStr, z.string().optional()),
    telecom_value: z.preprocess(toOptionalStr, z.string().optional()),
    telecom_use: z.preprocess(toOptionalStr, z.string().optional()),

    // Single address entry
    address_line: z.preprocess(toOptionalStr, z.string().optional()),
    address_city: z.preprocess(toOptionalStr, z.string().optional()),
    address_state: z.preprocess(toOptionalStr, z.string().optional()),
    address_postal_code: z.preprocess(toOptionalStr, z.string().optional()),
    address_country: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,
    name: d.name,
    active: d.active ?? true,
    partof: d.partof || undefined,
    partof_display: d.partof_display || undefined,

    type: d.org_type_code
      ? [
          {
            coding_system: d.org_type_system || undefined,
            coding_code: d.org_type_code,
            coding_display: d.org_type_display || undefined,
            text: d.org_type_text || undefined,
          },
        ]
      : undefined,

    alias: d.alias_value ? [{ value: d.alias_value }] : undefined,

    telecom:
      d.telecom_system && d.telecom_value
        ? [
            {
              system: d.telecom_system,
              value: d.telecom_value,
              use: d.telecom_use || undefined,
            },
          ]
        : undefined,

    address: d.address_line
      ? [
          {
            line: [d.address_line],
            city: d.address_city || undefined,
            state: d.address_state || undefined,
            postal_code: d.address_postal_code || undefined,
            country: d.address_country || undefined,
          },
        ]
      : undefined,
  }));
