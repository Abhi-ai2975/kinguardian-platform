/**
 * Location input validation schemas and DTO types.
 *
 * Layer: entities / schemas / location
 *
 * Mirrors fhir-gql's input Pydantic models exactly (app/schemas/location/input.py).
 * Covers: input sub-schemas, create / patch / list / getById / delete validation schemas.
 *
 * Confirmed differences from the Organization schema (do not "fix" these away —
 * they are real fhir-gql API differences):
 *  - Create array field names are PLURAL (identifiers, aliases, types, telecoms,
 *    endpoints) unlike Organization's singular names.
 *  - `aliases` is a plain string[], not an array of `{ value }` objects.
 *  - `user_id` / `org_id` are REQUIRED on create (fhir-gql does not stamp them
 *    from the session for Location) — the modal must guard against missing
 *    session values before submit.
 *  - `name` is optional (Organization's `name` is required).
 *  - `address` is a single flat set of `address_*` scalar fields, not an array.
 *  - Self-reference field is `part_of` (underscore), not `partof`.
 */

import { z } from "zod";

// ── Input sub-schemas ──────────────────────────────────────────────────────────

/** Single FHIR Identifier to attach to a Location on create. */
export const LocationIdentifierInputSchema = z.object({
  /**
   * Identifier use, e.g. usual | official | temp | secondary | old.
   * Sourced from the FHIR terminology server (resource="Patient" field=
   * "identifier.use") via TerminologySelect — not a fixed enum; fhir-gql
   * accepts any string here.
   */
  use: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  /** URI namespace of the identifier value. */
  system: z.string().optional(),
  /** Unlike Organization's identifier, value is NOT required here. */
  value: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});
export type TLocationIdentifierInput = z.infer<typeof LocationIdentifierInputSchema>;

/** FHIR coding used for Location.type entries (e.g. ward, building, room). */
export const LocationTypeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TLocationTypeInput = z.infer<typeof LocationTypeInputSchema>;

/**
 * Contact point (phone, email, etc.) for the location.
 * Unlike Organization's telecom, this includes period_start/period_end on create.
 * `system`/`use` are sourced from the terminology server (resource="Patient"
 * field="telecom.system"/"telecom.use") via TerminologySelect — not fixed enums.
 */
export const LocationTelecomInputSchema = z.object({
  system: z.string().optional(),
  value: z.string().optional(),
  use: z.string().optional(),
  rank: z.number().int().min(1).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type TLocationTelecomInput = z.infer<typeof LocationTelecomInputSchema>;

/** A single set of operating hours for one or more days of the week. */
export const LocationHoursOfOperationInputSchema = z.object({
  /** Days open: mon | tue | wed | thu | fri | sat | sun */
  days_of_week: z.array(z.string()).optional(),
  all_day: z.boolean().optional(),
  /** HH:mm:ss, e.g. "08:00:00" */
  opening_time: z.string().optional(),
  closing_time: z.string().optional(),
});
export type TLocationHoursOfOperationInput = z.infer<typeof LocationHoursOfOperationInputSchema>;

/** Technical endpoint reference to attach to the location. */
export const LocationEndpointInputSchema = z.object({
  /** FHIR reference string, e.g. "Endpoint/1". */
  reference: z.string().min(1, "Reference is required"),
  reference_display: z.string().optional(),
});
export type TLocationEndpointInput = z.infer<typeof LocationEndpointInputSchema>;

// ── Input validation schemas ───────────────────────────────────────────────────

/**
 * Full schema for creating a Location.
 * Mirrors fhir-gql's LocationCreateSchema — user_id and org_id are required
 * (fhir-gql does not infer them from the JWT for this resource); all other
 * fields are optional.
 */
export const CreateLocationValidationSchema = z.object({
  /** Better Auth user ID — required by fhir-gql for tenant scoping. */
  user_id: z.string().min(1, "User is required"),
  /** Better Auth active organization ID — required by fhir-gql for tenant scoping. */
  org_id: z.string().min(1, "Organization is required"),

  /**
   * Location status, e.g. active | suspended | inactive. Sourced from the
   * terminology server (resource="Location" field="status") via
   * TerminologySelect — not a fixed enum.
   */
  status: z.string().optional(),
  operational_status_system: z.string().optional(),
  operational_status_code: z.string().optional(),
  operational_status_display: z.string().optional(),

  name: z.string().optional(),
  description: z.string().optional(),
  /**
   * instance (physical) | kind (type/category). Sourced from the
   * terminology server (resource="Location" field="mode").
   */
  mode: z.string().optional(),

  identifiers: z.array(LocationIdentifierInputSchema).optional(),
  aliases: z.array(z.string()).optional(),
  types: z.array(LocationTypeInputSchema).optional(),
  telecoms: z.array(LocationTelecomInputSchema).optional(),

  /**
   * `use`/`type` sourced from the terminology server (resource="Patient"
   * field="address.use"/"address.type") via TerminologySelect.
   */
  address_use: z.string().optional(),
  address_type: z.string().optional(),
  address_text: z.string().optional(),
  address_line: z.array(z.string()).optional(),
  address_city: z.string().optional(),
  address_district: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),
  address_period_start: z.string().optional(),
  address_period_end: z.string().optional(),

  physical_type_system: z.string().optional(),
  /** bu=Building, wi=Wing, wa=Ward, ro=Room, bd=Bed, etc. */
  physical_type_code: z.string().optional(),
  physical_type_display: z.string().optional(),
  physical_type_text: z.string().optional(),

  /** FHIR reference to the managing organization, e.g. "Organization/190001". */
  managing_organization: z.string().optional(),
  managing_organization_display: z.string().optional(),
  /** FHIR reference to the parent location, e.g. "Location/230001". Used for hierarchy. */
  part_of: z.string().optional(),
  part_of_display: z.string().optional(),

  availability_exceptions: z.string().optional(),
  hours_of_operation: z.array(LocationHoursOfOperationInputSchema).optional(),

  position_longitude: z.number().optional(),
  position_latitude: z.number().optional(),
  position_altitude: z.number().optional(),

  endpoints: z.array(LocationEndpointInputSchema).optional(),
});
export type TCreateLocation = z.infer<typeof CreateLocationValidationSchema>;

/**
 * Base patch fields (no id, no refinement) — used for the service dto and
 * as the foundation for the full validation schema. Only scalar fields are
 * patchable — array sub-resources require delete + re-create.
 */
const PatchLocationBaseSchema = z.object({
  status: z.string().optional(),
  operational_status_system: z.string().optional(),
  operational_status_code: z.string().optional(),
  operational_status_display: z.string().optional(),

  name: z.string().optional(),
  description: z.string().optional(),
  mode: z.string().optional(),

  address_use: z.string().optional(),
  address_type: z.string().optional(),
  address_text: z.string().optional(),
  /** Patchable per fhir-gql's real LocationPatchSchema — unlike Organization's PATCH contract. */
  address_line: z.array(z.string()).optional(),
  address_city: z.string().optional(),
  address_district: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),
  address_period_start: z.string().optional(),
  address_period_end: z.string().optional(),

  physical_type_system: z.string().optional(),
  physical_type_code: z.string().optional(),
  physical_type_display: z.string().optional(),
  physical_type_text: z.string().optional(),

  managing_organization: z.string().optional(),
  managing_organization_display: z.string().optional(),
  part_of: z.string().optional(),
  part_of_display: z.string().optional(),

  availability_exceptions: z.string().optional(),

  position_longitude: z.number().optional(),
  position_latitude: z.number().optional(),
  position_altitude: z.number().optional(),
});

/** Dto variant (no id) — used by the service interface update method. */
export const PatchLocationDtoSchema = PatchLocationBaseSchema;
export type TPatchLocationDto = z.infer<typeof PatchLocationDtoSchema>;

/**
 * Full patch validation schema — includes id and enforces that at least one
 * patchable field is present. Child arrays are NOT patchable via PATCH — delete
 * and re-create to correct those.
 */
export const PatchLocationValidationSchema = PatchLocationBaseSchema.extend({
  id: z.number(),
}).refine(
  (fields) => Object.entries(fields).some(([key, value]) => key !== "id" && value !== undefined),
  { message: "At least one field must be provided for update" },
);
export type TPatchLocation = z.infer<typeof PatchLocationValidationSchema>;

/**
 * Query parameters for listing locations (server-side filtering + pagination).
 * Unlike Organization, there is no `name` or `user_id` filter — fhir-gql's
 * ListLocationsSchema only accepts org_id, status, limit, offset.
 */
export const ListLocationsValidationSchema = z.object({
  /** Filter by tenant organization ID — scopes results to a single tenant. */
  org_id: z.string().optional(),
  status: z.enum(["active", "suspended", "inactive"]).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListLocationsQuery = z.infer<typeof ListLocationsValidationSchema>;

export const GetLocationByIdValidationSchema = z.object({ id: z.number() });
export type TGetLocationById = z.infer<typeof GetLocationByIdValidationSchema>;

export const DeleteLocationValidationSchema = z.object({ id: z.number() });
export type TDeleteLocation = z.infer<typeof DeleteLocationValidationSchema>;
