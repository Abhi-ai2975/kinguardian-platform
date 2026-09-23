import { z } from "zod";

/** Coerce empty / null / "null" / "undefined" strings to undefined. */
const toOptionalStr = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  return s === "" || s === "undefined" || s === "null" ? undefined : s;
};

/** Coerce a stringified integer; returns -1 when invalid so Zod can reject it. */
const toPositiveInt = (v: unknown) => {
  if (v === undefined || v === null) return -1;
  const s = String(v);
  if (s === "" || s === "undefined" || s === "null") return -1;
  const n = Number(s);
  return isNaN(n) ? -1 : Math.floor(n);
};

/**
 * Parse a float from a form string value.
 * Returns undefined when blank or non-numeric so the field is omitted.
 */
const toOptionalDecimal = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (s === "" || s === "undefined" || s === "null") return undefined;
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
};

/**
 * Deserialise the hidden input produced by RepeatableGroup (data-json="true").
 * Accepts an already-parsed array (no-op) or a JSON string.
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
// Sub-schemas for RepeatableGroup rows
// ---------------------------------------------------------------------------

const locationTypeRowSchema = z.object({
  coding_code: z.preprocess(toOptionalStr, z.string().optional()),
  coding_system: z.preprocess(toOptionalStr, z.string().optional()),
  coding_display: z.preprocess(toOptionalStr, z.string().optional()),
  text: z.preprocess(toOptionalStr, z.string().optional()),
});

const telecomRowSchema = z.object({
  system: z.preprocess(toOptionalStr, z.string().optional()),
  value: z.preprocess(toOptionalStr, z.string().optional()),
  use: z.preprocess(toOptionalStr, z.string().optional()),
  rank: z.preprocess(
    (v) => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? undefined : n;
    },
    z.number().int().positive().optional(),
  ),
});

const hoursRowSchema = z.object({
  mon: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  tue: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  wed: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  thu: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  fri: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  sat: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  sun: z.preprocess((v) => v === true || v === "true", z.boolean().optional()),
  all_day: z.preprocess(
    (v) => v === true || v === "true",
    z.boolean().optional(),
  ),
  opening_time: z.preprocess(toOptionalStr, z.string().optional()),
  closing_time: z.preprocess(toOptionalStr, z.string().optional()),
});

const identifierRowSchema = z.object({
  use: z.preprocess(toOptionalStr, z.string().optional()),
  system: z.preprocess(toOptionalStr, z.string().optional()),
  value: z.preprocess(toOptionalStr, z.string().optional()),
  assigner: z.preprocess(toOptionalStr, z.string().optional()),
  type_code: z.preprocess(toOptionalStr, z.string().optional()),
  type_system: z.preprocess(toOptionalStr, z.string().optional()),
  type_display: z.preprocess(toOptionalStr, z.string().optional()),
  type_text: z.preprocess(toOptionalStr, z.string().optional()),
});

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

export const locationCreateSchema = z
  .object({
    // Seeded from Better Auth session by route.ts
    user_id: z.preprocess(
      toOptionalStr,
      z.string().min(1, "User session not found"),
    ),
    org_id: z.preprocess(
      toOptionalStr,
      z.string().min(1, "Organisation session not found"),
    ),

    // DynamicSelect id="managing_org" emits managing_org_ref_id + managing_org_display
    managing_org_ref_id: z.preprocess(
      (v) => {
        if (v === undefined || v === null) return undefined;
        const s = String(v);
        if (s === "" || s === "undefined" || s === "null") return undefined;
        const n = Number(s);
        return isNaN(n) ? undefined : Math.floor(n);
      },
      z.number().int().positive().optional(),
    ),
    managing_org_display: z.preprocess(toOptionalStr, z.string().optional()),

    // Core
    name: z.preprocess(
      toOptionalStr,
      z.string().min(1, "Location name is required"),
    ),
    status: z.preprocess(toOptionalStr, z.string().optional()),
    mode: z.preprocess(toOptionalStr, z.string().optional()),
    description: z.preprocess(toOptionalStr, z.string().optional()),

    // Aliases — comma-separated in the TextField, split to array in transform
    aliases: z.preprocess(toOptionalStr, z.string().optional()),

    // TerminologySelect id="operational_status" valueType="Coding"
    operational_status_code: z.preprocess(toOptionalStr, z.string().optional()),
    operational_status_system: z.preprocess(
      toOptionalStr,
      z.string().optional(),
    ),
    operational_status_display: z.preprocess(
      toOptionalStr,
      z.string().optional(),
    ),

    // TerminologySelect id="physical_type" valueType="CodeableConcept"
    physical_type_code: z.preprocess(toOptionalStr, z.string().optional()),
    physical_type_system: z.preprocess(toOptionalStr, z.string().optional()),
    physical_type_display: z.preprocess(toOptionalStr, z.string().optional()),
    physical_type_text: z.preprocess(toOptionalStr, z.string().optional()),

    // Functional types (RepeatableGroup → JSON array)
    types: z.preprocess(
      toJsonArray,
      z.array(locationTypeRowSchema).optional(),
    ),

    // Address
    address_use: z.preprocess(toOptionalStr, z.string().optional()),
    address_type: z.preprocess(toOptionalStr, z.string().optional()),
    address_text: z.preprocess(toOptionalStr, z.string().optional()),
    address_line: z.preprocess(toOptionalStr, z.string().optional()),
    address_city: z.preprocess(toOptionalStr, z.string().optional()),
    address_district: z.preprocess(toOptionalStr, z.string().optional()),
    address_state: z.preprocess(toOptionalStr, z.string().optional()),
    address_postal_code: z.preprocess(toOptionalStr, z.string().optional()),
    address_country: z.preprocess(toOptionalStr, z.string().optional()),

    // Contact details (RepeatableGroup → JSON array)
    telecoms: z.preprocess(
      toJsonArray,
      z.array(telecomRowSchema).optional(),
    ),

    // Location hierarchy
    part_of: z.preprocess(toOptionalStr, z.string().optional()),
    part_of_display: z.preprocess(toOptionalStr, z.string().optional()),

    // Geographic position
    position_latitude: z.preprocess(
      toOptionalDecimal,
      z.number().optional(),
    ),
    position_longitude: z.preprocess(
      toOptionalDecimal,
      z.number().optional(),
    ),
    position_altitude: z.preprocess(
      toOptionalDecimal,
      z.number().optional(),
    ),

    // Hours of operation (RepeatableGroup → JSON array)
    hours_of_operation: z.preprocess(
      toJsonArray,
      z.array(hoursRowSchema).optional(),
    ),

    // Identifiers (RepeatableGroup → JSON array)
    identifiers: z.preprocess(
      toJsonArray,
      z.array(identifierRowSchema).optional(),
    ),

    availability_exceptions: z.preprocess(toOptionalStr, z.string().optional()),
  })
  .transform((d) => {
    // Transform hours rows: collect boolean day fields → days_of_week string[]
    const hours_of_operation = d.hours_of_operation
      ?.map((row) => {
        const days = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const)
          .filter((day) => row[day]);
        return {
          days_of_week: days.length ? days : undefined,
          all_day: row.all_day || undefined,
          opening_time: row.opening_time || undefined,
          closing_time: row.closing_time || undefined,
        };
      })
      .filter((row) => row.days_of_week || row.all_day || row.opening_time);

    return {
      user_id: d.user_id,
      org_id: d.org_id,

      name: d.name,
      status: d.status || undefined,
      mode: d.mode || undefined,
      description: d.description || undefined,

      // Split comma-separated aliases to array, discard blank entries
      aliases: d.aliases
        ? d.aliases
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,

      operational_status_code: d.operational_status_code || undefined,
      operational_status_system: d.operational_status_system || undefined,
      operational_status_display: d.operational_status_display || undefined,

      physical_type_code: d.physical_type_code || undefined,
      physical_type_system: d.physical_type_system || undefined,
      physical_type_display: d.physical_type_display || undefined,
      physical_type_text: d.physical_type_text || undefined,

      // Filter out empty rows (user added a row but filled nothing)
      types: d.types?.filter((t) => t.coding_code || t.text) || undefined,

      // Managing organisation from DynamicSelect
      managing_organization: d.managing_org_ref_id
        ? `Organization/${d.managing_org_ref_id}`
        : undefined,
      managing_organization_display: d.managing_org_display || undefined,

      address_use: d.address_use || undefined,
      address_type: d.address_type || undefined,
      address_text: d.address_text || undefined,
      // FHIR Address.line is string[] — wrap the single text field
      address_line: d.address_line ? [d.address_line] : undefined,
      address_city: d.address_city || undefined,
      address_district: d.address_district || undefined,
      address_state: d.address_state || undefined,
      address_postal_code: d.address_postal_code || undefined,
      address_country: d.address_country || undefined,

      telecoms: d.telecoms?.filter((t) => t.system || t.value) || undefined,

      part_of: d.part_of || undefined,
      part_of_display: d.part_of_display || undefined,

      position_longitude:
        d.position_longitude !== undefined ? d.position_longitude : undefined,
      position_latitude:
        d.position_latitude !== undefined ? d.position_latitude : undefined,
      position_altitude:
        d.position_altitude !== undefined ? d.position_altitude : undefined,

      hours_of_operation:
        hours_of_operation?.length ? hours_of_operation : undefined,

      identifiers:
        d.identifiers?.filter((i) => i.value || i.system) || undefined,

      availability_exceptions: d.availability_exceptions || undefined,
    };
  });
