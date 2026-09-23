/**
 * practitioner_role_create_schema.ts
 *
 * Layer: client / ai-hub / schemas / validation / practitioner
 *
 * Zod validation + transform for the Create Practitioner Role A2UI form.
 * Handles two usage contexts:
 *
 *   Standalone workflow — practitioner selected via DynamicSelect;
 *     practitioner_ref_id is emitted by the field.
 *
 *   Step 7 of create_practitioner — practitioner_id is seeded from workflow
 *     sessionContext after step 1; practitioner_ref_id may be absent.
 *
 * The transform uses whichever is present (practitioner_ref_id takes priority).
 *
 * Field sources:
 *   DynamicSelect        → {id}_ref_id (int) + {id}_display (string)
 *   DynamicSelect template emit → {key} (string, e.g. "Location/10")
 *   TerminologySelect (CodeableConcept) in RepeatableGroup → {id}_code/system/display/text
 *   CheckBox / Switch    → boolean
 *   DateTimeInput        → ISO date string
 *   RepeatableGroup      → JSON-encoded array via toJsonArray preprocessor
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared preprocessors
// ---------------------------------------------------------------------------

/** Coerces empty / null / "null" / "undefined" strings to undefined. */
const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

/** Coerces a string or number to an integer, or undefined if invalid. */
const toOptionalInt = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : Math.floor(n);
};

/**
 * Parses a RepeatableGroup hidden-input value (JSON string or already-parsed
 * array) into a plain array for further Zod validation.
 */
const toJsonArray = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
};

// ---------------------------------------------------------------------------
// Row schemas for RepeatableGroup fields
// ---------------------------------------------------------------------------

/**
 * code row — TerminologySelect (CodeableConcept), id "code".
 * Emits: code_code, code_system, code_display, code_text.
 */
const codeRowSchema = z.object({
  code_code:    z.preprocess(toOptionalStr, z.string().optional()),
  code_system:  z.preprocess(toOptionalStr, z.string().optional()),
  code_display: z.preprocess(toOptionalStr, z.string().optional()),
  code_text:    z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * specialty row — TerminologySelect (CodeableConcept), id "specialty".
 * Emits: specialty_code, specialty_system, specialty_display, specialty_text.
 */
const specialtyRowSchema = z.object({
  specialty_code:    z.preprocess(toOptionalStr, z.string().optional()),
  specialty_system:  z.preprocess(toOptionalStr, z.string().optional()),
  specialty_display: z.preprocess(toOptionalStr, z.string().optional()),
  specialty_text:    z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * location row — DynamicSelect (id "location_select") inside RepeatableGroup.
 * Emits: location_reference (template "Location/{id}"), location_display.
 */
const locationRowSchema = z.object({
  location_reference: z.preprocess(toOptionalStr, z.string().optional()),
  location_display:   z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * healthcare_service row — DynamicSelect (id "hs_select") inside RepeatableGroup.
 * Emits: hs_reference (template "HealthcareService/{id}"), hs_display.
 */
const healthcareServiceRowSchema = z.object({
  hs_reference: z.preprocess(toOptionalStr, z.string().optional()),
  hs_display:   z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * available_time row — day checkboxes + all_day switch + open/close times.
 * Day fields arrive as booleans (CheckBox) or the string "true".
 */
const availTimeRowSchema = z.object({
  mon: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  tue: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  wed: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  thu: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  fri: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  sat: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  sun: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  all_day:              z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  available_start_time: z.preprocess(toOptionalStr, z.string().optional()),
  available_end_time:   z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * not_available row — reason description + optional date range.
 * Maps to PractitionerRoleAvailability.not_available_times[].
 */
const notAvailableRowSchema = z.object({
  description:  z.preprocess(toOptionalStr, z.string().optional()),
  during_start: z.preprocess(toOptionalStr, z.string().optional()),
  during_end:   z.preprocess(toOptionalStr, z.string().optional()),
});

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

export const practitionerRoleCreateSchema = z
  .object({
    /** Session-seeded tenant fields. */
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id:  z.preprocess(toOptionalStr, z.string().optional()),

    // Standalone: DynamicSelect (id "practitioner_select") emits practitioner_ref_id.
    // Step 7 (create_practitioner): practitioner_id seeded from sessionContext.
    practitioner_ref_id:  z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    practitioner_id:      z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    practitioner_display: z.preprocess(toOptionalStr, z.string().optional()),

    active:       z.boolean().optional(),
    period_start: z.preprocess(toOptionalStr, z.string().optional()),
    period_end:   z.preprocess(toOptionalStr, z.string().optional()),
    availability_exceptions: z.preprocess(toOptionalStr, z.string().optional()),

    // Organisation (DynamicSelect, id "org")
    org_ref_id:  z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    org_display: z.preprocess(toOptionalStr, z.string().optional()),

    // RepeatableGroups
    codes:               z.preprocess(toJsonArray, z.array(codeRowSchema).optional()),
    specialties:         z.preprocess(toJsonArray, z.array(specialtyRowSchema).optional()),
    locations:           z.preprocess(toJsonArray, z.array(locationRowSchema).optional()),
    healthcare_services: z.preprocess(toJsonArray, z.array(healthcareServiceRowSchema).optional()),
    available_time:      z.preprocess(toJsonArray, z.array(availTimeRowSchema).optional()),
    not_available:       z.preprocess(toJsonArray, z.array(notAvailableRowSchema).optional()),
  })
  .refine(
    (d) => {
      const id = d.practitioner_ref_id ?? d.practitioner_id;
      return id !== undefined && id > 0;
    },
    { message: "Practitioner is required", path: ["practitioner_ref_id"] },
  )
  .transform((d) => {
    const practId = d.practitioner_ref_id ?? d.practitioner_id;

    // ── code[] ────────────────────────────────────────────────────────────────
    const codes = d.codes
      ?.map((row) => ({
        coding_system:  row.code_system,
        coding_code:    row.code_code,
        coding_display: row.code_display,
        text:           row.code_text,
      }))
      .filter((r) => r.coding_code);

    // ── specialty[] ───────────────────────────────────────────────────────────
    const specialties = d.specialties
      ?.map((row) => ({
        coding_system:  row.specialty_system,
        coding_code:    row.specialty_code,
        coding_display: row.specialty_display,
        text:           row.specialty_text,
      }))
      .filter((r) => r.coding_code);

    // ── location[] ────────────────────────────────────────────────────────────
    const locations = d.locations
      ?.map((row) => ({
        reference:         row.location_reference,
        reference_display: row.location_display || undefined,
      }))
      .filter((r) => r.reference);

    // ── healthcare_service[] ──────────────────────────────────────────────────
    const healthcareServices = d.healthcare_services
      ?.map((row) => ({
        reference:         row.hs_reference,
        reference_display: row.hs_display || undefined,
      }))
      .filter((r) => r.reference);

    // ── available_times: day checkboxes → days_of_week string[] ──────────────
    const availTimes = d.available_time
      ?.map((item) => {
        const days = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const)
          .filter((day) => item[day]);
        return {
          days_of_week:         days.length ? days : undefined,
          all_day:              item.all_day              || undefined,
          available_start_time: item.available_start_time || undefined,
          available_end_time:   item.available_end_time   || undefined,
        };
      })
      .filter((row) => row.days_of_week || row.all_day || row.available_start_time);

    // ── not_available_times ────────────────────────────────────────────────────
    const notAvailTimes = d.not_available
      ?.map((row) => ({
        description:  row.description,
        during_start: row.during_start || undefined,
        during_end:   row.during_end   || undefined,
      }))
      .filter((row) => row.description);

    // Wrap both arrays into a single availability block (FHIR R5 structure).
    const availability =
      availTimes?.length || notAvailTimes?.length
        ? [
            {
              available_times:     availTimes?.length     ? availTimes     : undefined,
              not_available_times: notAvailTimes?.length  ? notAvailTimes  : undefined,
            },
          ]
        : undefined;

    return {
      user_id: d.user_id,
      org_id:  d.org_id,

      practitioner:         practId ? `Practitioner/${practId}` : undefined,
      practitioner_display: d.practitioner_display || undefined,

      active:                  d.active ?? true,
      period_start:            d.period_start || undefined,
      period_end:              d.period_end   || undefined,
      availability_exceptions: d.availability_exceptions || undefined,

      organization:         d.org_ref_id ? `Organization/${d.org_ref_id}` : undefined,
      organization_display: d.org_display || undefined,

      code:               codes?.length             ? codes             : undefined,
      specialty:          specialties?.length        ? specialties       : undefined,
      location:           locations?.length          ? locations         : undefined,
      healthcare_service: healthcareServices?.length ? healthcareServices : undefined,

      availability,
    };
  });
