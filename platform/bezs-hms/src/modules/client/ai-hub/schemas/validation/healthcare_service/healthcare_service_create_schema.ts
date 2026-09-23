/**
 * healthcare_service_create_schema.ts
 *
 * Layer: client / ai-hub / schemas / validation / healthcare_service
 *
 * Zod validation + transform for the Create Healthcare Service A2UI form.
 * Converts flat form fields (RepeatableGroup JSON arrays, TerminologySelect
 * hidden inputs, DataSelect emits) into the shape expected by
 * POST /healthcare-services/.
 *
 * Field sources:
 *   TextField         → plain string
 *   CheckBox / Switch → boolean
 *   TerminologySelect (code)            → single string value
 *   TerminologySelect (CodeableConcept) → four flat fields: {id}_code/system/display/text
 *   TerminologySelect in RepeatableGroup (serverSearch) → same four fields, serialised via toJsonArray
 *   DynamicSelect                        → {id}_ref_id (int) + {id}_display (string)
 *   RepeatableGroup                     → JSON-encoded array via toJsonArray preprocessor
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
  all_day: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  available_start_time: z.preprocess(toOptionalStr, z.string().optional()),
  available_end_time:   z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * telecom row — system (code), value, use (code), rank (positive int).
 */
const telecomRowSchema = z.object({
  system: z.preprocess(toOptionalStr, z.string().optional()),
  value:  z.preprocess(toOptionalStr, z.string().optional()),
  use:    z.preprocess(toOptionalStr, z.string().optional()),
  rank:   z.preprocess(
    (v) => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? undefined : n;
    },
    z.number().int().positive().optional(),
  ),
});

/**
 * category row — single TerminologySelect (CodeableConcept), id "category".
 */
const categoryRowSchema = z.object({
  category_code:    z.preprocess(toOptionalStr, z.string().optional()),
  category_system:  z.preprocess(toOptionalStr, z.string().optional()),
  category_display: z.preprocess(toOptionalStr, z.string().optional()),
  category_text:    z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * service_type row — single TerminologySelect (CodeableConcept), id "service_type".
 */
const serviceTypeRowSchema = z.object({
  service_type_code:    z.preprocess(toOptionalStr, z.string().optional()),
  service_type_system:  z.preprocess(toOptionalStr, z.string().optional()),
  service_type_display: z.preprocess(toOptionalStr, z.string().optional()),
  service_type_text:    z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * specialty row — single TerminologySelect (CodeableConcept), id "specialty".
 */
const specialtyRowSchema = z.object({
  specialty_code:    z.preprocess(toOptionalStr, z.string().optional()),
  specialty_system:  z.preprocess(toOptionalStr, z.string().optional()),
  specialty_display: z.preprocess(toOptionalStr, z.string().optional()),
  specialty_text:    z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * service_provision_code row — single TerminologySelect (CodeableConcept).
 * TerminologySelect id inside RepeatableGroup is "service_provision_code",
 * so emitted hidden inputs are service_provision_code_code/system/display/text.
 */
const serviceProvisionCodeRowSchema = z.object({
  service_provision_code_code:    z.preprocess(toOptionalStr, z.string().optional()),
  service_provision_code_system:  z.preprocess(toOptionalStr, z.string().optional()),
  service_provision_code_display: z.preprocess(toOptionalStr, z.string().optional()),
  service_provision_code_text:    z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * program row — single TerminologySelect (CodeableConcept), id "program".
 */
const programRowSchema = z.object({
  program_code:    z.preprocess(toOptionalStr, z.string().optional()),
  program_system:  z.preprocess(toOptionalStr, z.string().optional()),
  program_display: z.preprocess(toOptionalStr, z.string().optional()),
  program_text:    z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * location row — DynamicSelect inside RepeatableGroup, id "location_select".
 * Emits location_reference (template "Location/{id}") + location_display (name).
 */
const locationRowSchema = z.object({
  location_reference: z.preprocess(toOptionalStr, z.string().optional()),
  location_display:   z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * communication row — single TerminologySelect (CodeableConcept), id "communication".
 */
const communicationRowSchema = z.object({
  communication_code:    z.preprocess(toOptionalStr, z.string().optional()),
  communication_system:  z.preprocess(toOptionalStr, z.string().optional()),
  communication_display: z.preprocess(toOptionalStr, z.string().optional()),
  communication_text:    z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * characteristic row — single TerminologySelect (CodeableConcept), id "characteristic".
 */
const characteristicRowSchema = z.object({
  characteristic_code:    z.preprocess(toOptionalStr, z.string().optional()),
  characteristic_system:  z.preprocess(toOptionalStr, z.string().optional()),
  characteristic_display: z.preprocess(toOptionalStr, z.string().optional()),
  characteristic_text:    z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * referral_method row — single TerminologySelect (CodeableConcept), id "referral_method".
 */
const referralMethodRowSchema = z.object({
  referral_method_code:    z.preprocess(toOptionalStr, z.string().optional()),
  referral_method_system:  z.preprocess(toOptionalStr, z.string().optional()),
  referral_method_display: z.preprocess(toOptionalStr, z.string().optional()),
  referral_method_text:    z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * identifier row — use (code), type coding, system URI, value (required),
 * period_start/end, assigner.
 */
const identifierRowSchema = z.object({
  use:          z.preprocess(toOptionalStr, z.string().optional()),
  system:       z.preprocess(toOptionalStr, z.string().optional()),
  value:        z.preprocess(toOptionalStr, z.string().optional()),
  assigner:     z.preprocess(toOptionalStr, z.string().optional()),
  period_start: z.preprocess(toOptionalStr, z.string().optional()),
  period_end:   z.preprocess(toOptionalStr, z.string().optional()),
  type_code:    z.preprocess(toOptionalStr, z.string().optional()),
  type_system:  z.preprocess(toOptionalStr, z.string().optional()),
  type_display: z.preprocess(toOptionalStr, z.string().optional()),
});

/**
 * not_available row — description (required text) + optional date range.
 */
const notAvailableRowSchema = z.object({
  description:  z.preprocess(toOptionalStr, z.string().optional()),
  during_start: z.preprocess(toOptionalStr, z.string().optional()),
  during_end:   z.preprocess(toOptionalStr, z.string().optional()),
});

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

export const healthcareServiceCreateSchema = z
  .object({
    /** Session-seeded tenant fields. */
    user_id: z.preprocess(toOptionalStr, z.string().optional()),
    org_id:  z.preprocess(toOptionalStr, z.string().optional()),

    // ── Photo (FileUpload — optional, single image) ───────────────────────
    service_photo: z
      .object({
        fileId:      z.string(),
        filename:    z.string(),
        contentType: z.string(),
        sizeBytes:   z.number(),
      })
      .optional()
      .nullable(),

    // ── Service Details ───────��────────────────────────────────────────────
    name:                 z.preprocess(toOptionalStr, z.string().min(1, "Service name is required")),
    active:               z.boolean().optional(),
    appointment_required: z.boolean().optional(),
    comment:              z.preprocess(toOptionalStr, z.string().optional()),
    extra_details:        z.preprocess(toOptionalStr, z.string().optional()),
    availability_exceptions: z.preprocess(toOptionalStr, z.string().optional()),

    // ── Organisation (DynamicSelect emits) ────────────────────────────────
    org_ref_id:  z.preprocess(toOptionalInt, z.number().int().positive().optional()),
    org_display: z.preprocess(toOptionalStr, z.string().optional()),

    // ── Locations (RepeatableGroup + DynamicSelect) ────────────────────────
    locations: z.preprocess(toJsonArray, z.array(locationRowSchema).optional()),

    // ── Classification — RepeatableGroup arrays ───────────────────────────
    categories:   z.preprocess(toJsonArray, z.array(categoryRowSchema).optional()),
    service_types: z.preprocess(toJsonArray, z.array(serviceTypeRowSchema).optional()),
    specialties:  z.preprocess(toJsonArray, z.array(specialtyRowSchema).optional()),

    // ── RepeatableGroup arrays ─────────────────────────────────────────────
    identifiers:            z.preprocess(toJsonArray, z.array(identifierRowSchema).optional()),
    service_provision_codes: z.preprocess(toJsonArray, z.array(serviceProvisionCodeRowSchema).optional()),
    telecoms:               z.preprocess(toJsonArray, z.array(telecomRowSchema).optional()),
    programs:               z.preprocess(toJsonArray, z.array(programRowSchema).optional()),
    communications:         z.preprocess(toJsonArray, z.array(communicationRowSchema).optional()),
    characteristics:        z.preprocess(toJsonArray, z.array(characteristicRowSchema).optional()),
    referral_methods:       z.preprocess(toJsonArray, z.array(referralMethodRowSchema).optional()),
    available_time:         z.preprocess(toJsonArray, z.array(availTimeRowSchema).optional()),
    not_available:          z.preprocess(toJsonArray, z.array(notAvailableRowSchema).optional()),
  })
  .transform((d) => {
    // ── available_time: day checkboxes → days_of_week string[] ────────────
    const availTime = d.available_time
      ?.map((item) => {
        const days = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const)
          .filter((day) => item[day])
          .map((day) => day);
        return {
          days_of_week:         days.length ? days : undefined,
          all_day:              item.all_day  || undefined,
          available_start_time: item.available_start_time || undefined,
          available_end_time:   item.available_end_time   || undefined,
        };
      })
      .filter((row) => row.days_of_week || row.all_day || row.available_start_time);

    // ── not_available rows ─────────────────────────────────────────────────
    const notAvailable = d.not_available
      ?.map((row) => ({
        description:  row.description,
        during_start: row.during_start || undefined,
        during_end:   row.during_end   || undefined,
      }))
      .filter((row) => row.description);

    // ── telecoms rows ──────────────────────────────────────────────────────
    const telecoms = d.telecoms
      ?.map((row) => ({
        system: row.system  || undefined,
        value:  row.value   || undefined,
        use:    row.use     || undefined,
        rank:   row.rank,
      }))
      .filter((row) => row.system || row.value);

    // ── Identifiers ───────────────────────────────────────────────────────
    const identifiers = d.identifiers
      ?.map((row) => ({
        use:          row.use          || undefined,
        system:       row.system       || undefined,
        value:        row.value,
        assigner:     row.assigner     || undefined,
        period_start: row.period_start || undefined,
        period_end:   row.period_end   || undefined,
        type_system:  row.type_system  || undefined,
        type_code:    row.type_code    || undefined,
        type_display: row.type_display || undefined,
      }))
      .filter((r) => r.value);

    // ── Location array ────────────────────────────────────────────────────
    const locations = d.locations
      ?.map((row) => ({
        reference:         row.location_reference,
        reference_display: row.location_display || undefined,
      }))
      .filter((r) => r.reference);

    // ── Classification arrays ──────────────────────────────────────────────

    const categories = d.categories
      ?.map((row) => ({
        coding_system:  row.category_system,
        coding_code:    row.category_code,
        coding_display: row.category_display,
        text:           row.category_text,
      }))
      .filter((r) => r.coding_code);

    const serviceTypes = d.service_types
      ?.map((row) => ({
        coding_system:  row.service_type_system,
        coding_code:    row.service_type_code,
        coding_display: row.service_type_display,
        text:           row.service_type_text,
      }))
      .filter((r) => r.coding_code);

    const specialties = d.specialties
      ?.map((row) => ({
        coding_system:  row.specialty_system,
        coding_code:    row.specialty_code,
        coding_display: row.specialty_display,
        text:           row.specialty_text,
      }))
      .filter((r) => r.coding_code);

    // ── CodeableConcept array builders ────────────────────────────────────

    const serviceProvisionCodes = d.service_provision_codes
      ?.map((row) => ({
        coding_system:  row.service_provision_code_system,
        coding_code:    row.service_provision_code_code,
        coding_display: row.service_provision_code_display,
        text:           row.service_provision_code_text,
      }))
      .filter((r) => r.coding_code);

    const programs = d.programs
      ?.map((row) => ({
        coding_system:  row.program_system,
        coding_code:    row.program_code,
        coding_display: row.program_display,
        text:           row.program_text,
      }))
      .filter((r) => r.coding_code);

    const communications = d.communications
      ?.map((row) => ({
        coding_system:  row.communication_system,
        coding_code:    row.communication_code,
        coding_display: row.communication_display,
        text:           row.communication_text,
      }))
      .filter((r) => r.coding_code);

    const characteristics = d.characteristics
      ?.map((row) => ({
        coding_system:  row.characteristic_system,
        coding_code:    row.characteristic_code,
        coding_display: row.characteristic_display,
        text:           row.characteristic_text,
      }))
      .filter((r) => r.coding_code);

    const referralMethods = d.referral_methods
      ?.map((row) => ({
        coding_system:  row.referral_method_system,
        coding_code:    row.referral_method_code,
        coding_display: row.referral_method_display,
        text:           row.referral_method_text,
      }))
      .filter((r) => r.coding_code);

    return {
      user_id: d.user_id,
      org_id:  d.org_id,

      // Photo (FHIR Attachment flattened)
      photo_url:          d.service_photo?.fileId      || undefined,
      photo_content_type: d.service_photo?.contentType || undefined,
      photo_title:        d.service_photo?.filename    || undefined,
      photo_size:         d.service_photo?.sizeBytes   ?? undefined,
      photo_creation:     d.service_photo              ? new Date().toISOString() : undefined,

      // Scalars
      name:                    d.name,
      active:                  d.active ?? true,
      appointment_required:    d.appointment_required ?? false,
      comment:                 d.comment       || undefined,
      extra_details:           d.extra_details || undefined,
      availability_exceptions: d.availability_exceptions || undefined,

      // References
      provided_by:         d.org_ref_id ? `Organization/${d.org_ref_id}` : undefined,
      provided_by_display: d.org_display || undefined,

      // Classification arrays
      category:  categories?.length  ? categories  : undefined,
      type:      serviceTypes?.length ? serviceTypes : undefined,
      specialty: specialties?.length  ? specialties  : undefined,

      // Location reference array
      location: locations?.length ? locations : undefined,

      // Arrays from RepeatableGroups
      identifier:             identifiers?.length            ? identifiers            : undefined,
      service_provision_code: serviceProvisionCodes?.length ? serviceProvisionCodes : undefined,
      telecom:                telecoms?.length                ? telecoms              : undefined,
      program:                programs?.length                ? programs              : undefined,
      communication:          communications?.length          ? communications        : undefined,
      characteristic:         characteristics?.length         ? characteristics       : undefined,
      referral_method:        referralMethods?.length         ? referralMethods       : undefined,
      available_time:         availTime?.length               ? availTime             : undefined,
      not_available:          notAvailable?.length            ? notAvailable          : undefined,
    };
  });
