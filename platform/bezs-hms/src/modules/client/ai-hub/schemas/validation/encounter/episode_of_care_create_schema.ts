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

export const episodeOfCareCreateSchema = z
  .object({
    // Identity — seeded from session by route.ts
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Patient resolved automatically from /patients/me context resolver
    patient_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),

    // TerminologySelect code id="eoc_status" (required)
    eoc_status: z.string().min(1, "Episode status is required"),

    // TerminologySelect CodeableConcept id="eoc_type" (optional)
    eoc_type_code: z.preprocess(toOptionalStr, z.string().optional()),
    eoc_type_system: z.preprocess(toOptionalStr, z.string().optional()),
    eoc_type_display: z.preprocess(toOptionalStr, z.string().optional()),
    eoc_type_text: z.preprocess(toOptionalStr, z.string().optional()),

    // DataSelect id="eoc_org" emits eoc_org_ref_id + eoc_org_display
    eoc_org_ref_id: z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    eoc_org_display: z.preprocess(toOptionalStr, z.string().optional()),

    // DateTimeInput date-only fields
    period_start: z.preprocess(toOptionalStr, z.string().optional()),
    period_end: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    status: d.eoc_status,

    patient: d.patient_id ? `Patient/${d.patient_id}` : undefined,

    managing_organization: d.eoc_org_ref_id
      ? `Organization/${d.eoc_org_ref_id}`
      : undefined,
    managing_organization_display: d.eoc_org_display || undefined,

    period_start: d.period_start || undefined,
    period_end: d.period_end || undefined,

    types: d.eoc_type_code
      ? [
          {
            coding_system: d.eoc_type_system,
            coding_code: d.eoc_type_code,
            coding_display: d.eoc_type_display,
            text: d.eoc_type_text,
          },
        ]
      : undefined,
  }));
