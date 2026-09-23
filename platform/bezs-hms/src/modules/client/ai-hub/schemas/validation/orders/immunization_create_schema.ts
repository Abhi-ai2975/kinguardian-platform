import { z } from "zod";

const toOptionalStr = (v: unknown): string | undefined => {
  if (
    !v ||
    String(v) === "" ||
    String(v) === "undefined" ||
    String(v) === "null"
  )
    return undefined;
  return String(v);
};

const toOptionalInt = (v: unknown): number | undefined => {
  if (!v) return undefined;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : Math.floor(n);
};

const toOptionalFloat = (v: unknown): number | undefined => {
  if (!v) return undefined;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
};

const toOptionalBool = (v: unknown): boolean | undefined => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "1" || s === "on") return true;
  if (s === "false" || s === "0" || s === "off") return false;
  return undefined;
};

/**
 * Validates and transforms the immunization recording form data.
 *
 * TerminologySelect id="vaccine_code" valueType="CodeableConcept" → vaccine_code_code, vaccine_code_system, vaccine_code_display, vaccine_code_text
 * TerminologySelect id="status" valueType="code" → status
 * TerminologySelect id="site" valueType="CodeableConcept" → site_code, site_system, site_display, site_text
 * DataSelect id="performer" emits key="ref_id" → performer_ref_id
 * CheckBox id="primary_source" → primary_source
 * DateTimeInput id="occurrence_datetime" → occurrence_datetime
 * DateTimeInput id="expiration_date" → expiration_date
 */
export const immunizationCreateSchema = z
  .object({
    // Identity — seeded from Better Auth session by route.ts
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id: z.preprocess(toOptionalStr, z.string().optional()),

    // Patient — resolved from me_patient context_resolver
    patient_id: z.preprocess(
      toOptionalInt,
      z.number().int().positive().optional(),
    ),
    // Encounter — from session context
    encounter_id: z.preprocess(
      toOptionalInt,
      z.number().int().positive().optional(),
    ),

    // Status (required)
    status: z.string().min(1, "Status is required"),

    // Occurrence
    occurrence_datetime: z.preprocess(toOptionalStr, z.string().optional()),

    // Primary source flag
    primary_source: z.preprocess(toOptionalBool, z.boolean().optional()),

    // Vaccine code — TerminologySelect CodeableConcept id="vaccine_code"
    vaccine_code_code: z.preprocess(toOptionalStr, z.string().optional()),
    vaccine_code_system: z.preprocess(toOptionalStr, z.string().optional()),
    vaccine_code_display: z.preprocess(toOptionalStr, z.string().optional()),
    vaccine_code_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Lot details
    lot_number: z.preprocess(toOptionalStr, z.string().optional()),
    expiration_date: z.preprocess(toOptionalStr, z.string().optional()),

    // Dose
    dose_quantity_value: z.preprocess(
      toOptionalFloat,
      z.number().positive().optional(),
    ),
    dose_quantity_unit: z.preprocess(toOptionalStr, z.string().optional()),

    // Injection site — TerminologySelect CodeableConcept id="site"
    site_code: z.preprocess(toOptionalStr, z.string().optional()),
    site_system: z.preprocess(toOptionalStr, z.string().optional()),
    site_display: z.preprocess(toOptionalStr, z.string().optional()),
    site_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Performer — DataSelect id="performer", emits key="ref_id" → performer_ref_id
    performer_ref_id: z.preprocess(
      toOptionalInt,
      z.number().int().positive().optional(),
    ),
  })
  .transform((d) => ({
    user_id: d.user_id,
    org_id: d.org_id,

    status: d.status,
    occurrence_datetime: d.occurrence_datetime,
    primary_source: d.primary_source,

    // Vaccine code
    vaccine_code_system: d.vaccine_code_system,
    vaccine_code_code: d.vaccine_code_code,
    vaccine_code_display: d.vaccine_code_display,
    vaccine_code_text: d.vaccine_code_text,

    // Patient & encounter references
    patient: d.patient_id ? `Patient/${d.patient_id}` : undefined,
    encounter: d.encounter_id ? `Encounter/${d.encounter_id}` : undefined,

    // Lot
    lot_number: d.lot_number,
    expiration_date: d.expiration_date,

    // Dose quantity
    dose_quantity_value: d.dose_quantity_value,
    dose_quantity_unit: d.dose_quantity_unit,

    // Injection site
    site_system: d.site_system,
    site_code: d.site_code,
    site_display: d.site_display,
    site_text: d.site_text,

    // Performers array
    performers: d.performer_ref_id
      ? [{ actor: `Practitioner/${d.performer_ref_id}` }]
      : undefined,
  }));
