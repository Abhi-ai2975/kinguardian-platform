/**
 * Location response schemas.
 *
 * Layer: entities / schemas / location
 *
 * Mirrors fhir-gql's app/schemas/location/response.py. All optional fields use
 * .nullish() — the fhir-gql API serialises Python's Optional[X] = None as
 * explicit JSON null, not as a missing key.
 *
 * fhir-gql's LocationResponse types its array sub-resources as untyped
 * List[Dict] (forwarded as-is from the fhir-server, never validated by
 * fhir-gql itself) rather than typed sub-models like Organization's response.
 * Every field below is therefore `.nullish()` so a row-shape mismatch fails
 * soft instead of throwing during response parsing.
 *
 * Confirmed differences from Organization's response schema:
 *  - `part_of_id` / `managing_organization_id` are declared `Optional[str]`
 *    in fhir-gql's own Pydantic model, but have been observed coming back
 *    as raw JSON numbers at runtime (that endpoint's response apparently
 *    isn't always going through the declared model's string coercion) —
 *    accepted as `string | number` here and normalized to a string so
 *    parsing never breaks regardless of which shape the API sends.
 *    Hierarchy/tree code must still coerce both sides to string before
 *    comparing ids (Organization's `partof_id` is a plain number).
 *  - `alias` is a plain string[], not an array of `{ id, value }` objects.
 *  - `address_line` is absent from fhir-gql's typed response model even
 *    though it's accepted on create — included here defensively as
 *    `.nullish()` in case the underlying fhir-server does return it.
 */

import { z } from "zod";

/**
 * `managing_organization_id`/`part_of_id` are declared `Optional[str]` in
 * fhir-gql's own model but have been observed returning as raw numbers —
 * accept either and normalize to a string.
 */
const StringifiedIdSchema = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (typeof v === "number" ? String(v) : v));

/** Single FHIR Identifier attached to a Location. */
export const LocationIdentifierResponseSchema = z.object({
  id: z.number().nullish(),
  use: z.string().nullish(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  assigner: z.string().nullish(),
});
export type TLocationIdentifierResponse = z.infer<typeof LocationIdentifierResponseSchema>;

/** FHIR Location.type coding — categorizes the location (e.g. ward, building, room). */
export const LocationTypeResponseSchema = z.object({
  id: z.number().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TLocationTypeResponse = z.infer<typeof LocationTypeResponseSchema>;

/** Single contact point (phone, email, fax, etc.) for the location. */
export const LocationTelecomResponseSchema = z.object({
  id: z.number().nullish(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TLocationTelecomResponse = z.infer<typeof LocationTelecomResponseSchema>;

/** A single set of operating hours for one or more days of the week. */
export const LocationHoursOfOperationResponseSchema = z.object({
  id: z.number().nullish(),
  days_of_week: z.array(z.string()).nullish(),
  all_day: z.boolean().nullish(),
  opening_time: z.string().nullish(),
  closing_time: z.string().nullish(),
});
export type TLocationHoursOfOperationResponse = z.infer<
  typeof LocationHoursOfOperationResponseSchema
>;

/** Technical endpoint reference attached to the location. */
export const LocationEndpointResponseSchema = z.object({
  id: z.number().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TLocationEndpointResponse = z.infer<typeof LocationEndpointResponseSchema>;

/** Full FHIR Location resource returned by the fhir-gql API. */
export const LocationResponseSchema = z.object({
  id: z.number(),
  status: z.string().nullish(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  mode: z.string().nullish(),

  operational_status_system: z.string().nullish(),
  operational_status_code: z.string().nullish(),
  operational_status_display: z.string().nullish(),

  // Address — flattened, single address (no array), unlike Organization.
  address_use: z.string().nullish(),
  address_type: z.string().nullish(),
  address_text: z.string().nullish(),
  /** Defensive addition — absent from fhir-gql's typed model but present on create. */
  address_line: z.array(z.string()).nullish(),
  address_city: z.string().nullish(),
  address_district: z.string().nullish(),
  address_state: z.string().nullish(),
  address_postal_code: z.string().nullish(),
  address_country: z.string().nullish(),
  address_period_start: z.string().nullish(),
  address_period_end: z.string().nullish(),

  physical_type_system: z.string().nullish(),
  physical_type_code: z.string().nullish(),
  physical_type_display: z.string().nullish(),
  physical_type_text: z.string().nullish(),

  // Relationships — managing_organization_id / part_of_id: see StringifiedIdSchema above.
  managing_organization_type: z.string().nullish(),
  managing_organization_id: StringifiedIdSchema,
  managing_organization_display: z.string().nullish(),
  part_of_type: z.string().nullish(),
  part_of_id: StringifiedIdSchema,
  part_of_display: z.string().nullish(),

  availability_exceptions: z.string().nullish(),

  position_longitude: z.number().nullish(),
  position_latitude: z.number().nullish(),
  position_altitude: z.number().nullish(),

  // Sub-resource arrays
  identifier: z.array(LocationIdentifierResponseSchema).nullish(),
  /** Plain strings — no row objects, unlike Organization's alias shape. */
  alias: z.array(z.string()).nullish(),
  type: z.array(LocationTypeResponseSchema).nullish(),
  telecom: z.array(LocationTelecomResponseSchema).nullish(),
  hours_of_operation: z.array(LocationHoursOfOperationResponseSchema).nullish(),
  endpoint: z.array(LocationEndpointResponseSchema).nullish(),

  // Audit fields injected by the fhir-gql server
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TLocationResponse = z.infer<typeof LocationResponseSchema>;

/**
 * Paginated list response — { total, limit, offset, data: TLocationResponse[] }.
 * `total` is the full count before pagination so clients can calculate page count.
 */
export const PaginatedLocationResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(LocationResponseSchema),
});
export type TPaginatedLocationResponse = z.infer<typeof PaginatedLocationResponseSchema>;
