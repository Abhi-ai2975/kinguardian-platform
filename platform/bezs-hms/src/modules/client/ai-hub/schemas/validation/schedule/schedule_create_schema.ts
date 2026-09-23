/**
 * schedule_create_schema.ts
 *
 * Layer: client / ai-hub / schemas / validation / schedule
 *
 * Zod validation + transform for the Create Schedule A2UI form.
 * Handles three actor types via RepeatableGroup + DynamicSelect:
 *   practitioner_roles[]  → actor[] references with "PractitionerRole/{id}"
 *   locations[]           → actor[] references with "Location/{id}"
 *   healthcare_services[] → actor[] references with "HealthcareService/{id}"
 *
 * All three actor arrays are merged into a single actor[] in the POST body.
 * specialty[] and service_type[] are also multi-entry via RepeatableGroup.
 *
 * Field sources:
 *   DynamicSelect template emit → reference string (e.g. "PractitionerRole/300")
 *   DynamicSelect path emit     → display string
 *   TerminologySelect (CodeableConcept) in RepeatableGroup → {id}_code/system/display/text
 *   CheckBox            → boolean
 *   DateTimeInput       → ISO datetime string
 *   RepeatableGroup     → JSON-encoded array via toJsonArray preprocessor
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
 * practitioner_role row — DynamicSelect (id "pr_select") inside RepeatableGroup.
 * Emits: role_reference (template "PractitionerRole/{id}"), role_display.
 */
const practitionerRoleRowSchema = z.object({
  role_reference: z.preprocess(toOptionalStr, z.string().optional()),
  role_display:   z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * location row — DynamicSelect (id "loc_select") inside RepeatableGroup.
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
 * service_type row — TerminologySelect (CodeableConcept), id "service_type".
 * Emits: service_type_code, service_type_system, service_type_display, service_type_text.
 */
const serviceTypeRowSchema = z.object({
  service_type_code:    z.preprocess(toOptionalStr, z.string().optional()),
  service_type_system:  z.preprocess(toOptionalStr, z.string().optional()),
  service_type_display: z.preprocess(toOptionalStr, z.string().optional()),
  service_type_text:    z.preprocess(toOptionalStr, z.string().optional()),
});

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

export const scheduleCreateSchema = z
  .object({
    /** Session-seeded tenant fields. */
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id:  z.preprocess(toOptionalStr, z.string().optional()),

    active:  z.boolean().optional(),
    comment: z.preprocess(toOptionalStr, z.string().optional()),

    planning_horizon_start: z.preprocess(toOptionalStr, z.string().optional()),
    planning_horizon_end:   z.preprocess(toOptionalStr, z.string().optional()),

    // Actor RepeatableGroups — all three merged into actor[] in the transform
    practitioner_roles:  z.preprocess(toJsonArray, z.array(practitionerRoleRowSchema).optional()),
    locations:           z.preprocess(toJsonArray, z.array(locationRowSchema).optional()),
    healthcare_services: z.preprocess(toJsonArray, z.array(healthcareServiceRowSchema).optional()),

    // Classification RepeatableGroups
    specialties:   z.preprocess(toJsonArray, z.array(specialtyRowSchema).optional()),
    service_types: z.preprocess(toJsonArray, z.array(serviceTypeRowSchema).optional()),
  })
  .transform((d) => {
    // ── Actor array — merge PractitionerRole + Location + HealthcareService ────
    const prActors = d.practitioner_roles
      ?.map((row) => ({
        reference:         row.role_reference,
        reference_display: row.role_display || undefined,
      }))
      .filter((r) => r.reference) ?? [];

    const locActors = d.locations
      ?.map((row) => ({
        reference:         row.location_reference,
        reference_display: row.location_display || undefined,
      }))
      .filter((r) => r.reference) ?? [];

    const hsActors = d.healthcare_services
      ?.map((row) => ({
        reference:         row.hs_reference,
        reference_display: row.hs_display || undefined,
      }))
      .filter((r) => r.reference) ?? [];

    const actor = [...prActors, ...locActors, ...hsActors];

    // ── Specialty array ────────────────────────────────────────────────────────
    const specialty = d.specialties
      ?.map((row) => ({
        coding_system:  row.specialty_system,
        coding_code:    row.specialty_code,
        coding_display: row.specialty_display,
        text:           row.specialty_text,
      }))
      .filter((r) => r.coding_code);

    // ── Service type array ─────────────────────────────────────────────────────
    const serviceType = d.service_types
      ?.map((row) => ({
        coding_system:  row.service_type_system,
        coding_code:    row.service_type_code,
        coding_display: row.service_type_display,
        text:           row.service_type_text,
      }))
      .filter((r) => r.coding_code);

    return {
      user_id: d.user_id,
      org_id:  d.org_id,

      active:  d.active ?? true,
      comment: d.comment || undefined,

      planning_horizon_start: d.planning_horizon_start || undefined,
      planning_horizon_end:   d.planning_horizon_end   || undefined,

      actor:        actor.length        ? actor        : undefined,
      specialty:    specialty?.length   ? specialty    : undefined,
      service_type: serviceType?.length ? serviceType  : undefined,
    };
  });
