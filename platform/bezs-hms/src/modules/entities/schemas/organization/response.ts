/**
 * Organization response schemas.
 *
 * Layer: entities / schemas / organization
 *
 * All optional fields use .nullish() — the fhir-gql API serialises Python's
 * Optional[X] = None as explicit JSON null, not as a missing key.
 * .nullish() = z.T().optional().nullable() — accepts T | null | undefined.
 */

import { z } from "zod";

/** Single FHIR Identifier attached to an Organization. */
export const OrgIdentifierResponseSchema = z.object({
  id: z.number(),
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
export type TOrgIdentifierResponse = z.infer<typeof OrgIdentifierResponseSchema>;

/**
 * FHIR Organization.type coding — classifies the organization
 * (e.g. prov = Healthcare Provider, dept = Hospital Department).
 */
export const OrgTypeResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TOrgTypeResponse = z.infer<typeof OrgTypeResponseSchema>;

/** Alternative name the organization is or was known by. */
export const OrgAliasResponseSchema = z.object({
  id: z.number(),
  value: z.string().nullish(),
});
export type TOrgAliasResponse = z.infer<typeof OrgAliasResponseSchema>;

/** Single contact point (phone, email, fax, etc.) for the organization. */
export const OrgTelecomResponseSchema = z.object({
  id: z.number(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TOrgTelecomResponse = z.infer<typeof OrgTelecomResponseSchema>;

/** Postal or physical address for the organization. */
export const OrgAddressResponseSchema = z.object({
  id: z.number(),
  use: z.string().nullish(),
  type: z.string().nullish(),
  text: z.string().nullish(),
  line: z.array(z.string()).nullish(),
  city: z.string().nullish(),
  district: z.string().nullish(),
  state: z.string().nullish(),
  postal_code: z.string().nullish(),
  country: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TOrgAddressResponse = z.infer<typeof OrgAddressResponseSchema>;

/** Telecom nested inside an org contact person (separate from the org-level telecom). */
export const OrgContactTelecomResponseSchema = z.object({
  id: z.number(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TOrgContactTelecomResponse = z.infer<typeof OrgContactTelecomResponseSchema>;

/** Contact person for the organization (admin, billing, clinical, etc.). */
export const OrgContactResponseSchema = z.object({
  id: z.number(),
  purpose_system: z.string().nullish(),
  purpose_code: z.string().nullish(),
  purpose_display: z.string().nullish(),
  purpose_text: z.string().nullish(),
  name_use: z.string().nullish(),
  name_text: z.string().nullish(),
  name_family: z.string().nullish(),
  name_given: z.array(z.string()).nullish(),
  name_prefix: z.array(z.string()).nullish(),
  name_suffix: z.array(z.string()).nullish(),
  name_period_start: z.string().nullish(),
  name_period_end: z.string().nullish(),
  address_use: z.string().nullish(),
  address_type: z.string().nullish(),
  address_text: z.string().nullish(),
  address_line: z.array(z.string()).nullish(),
  address_city: z.string().nullish(),
  address_district: z.string().nullish(),
  address_state: z.string().nullish(),
  address_postal_code: z.string().nullish(),
  address_country: z.string().nullish(),
  address_period_start: z.string().nullish(),
  address_period_end: z.string().nullish(),
  telecoms: z.array(OrgContactTelecomResponseSchema).nullish(),
});
export type TOrgContactResponse = z.infer<typeof OrgContactResponseSchema>;

/** Technical endpoint reference attached to the organization. */
export const OrgEndpointResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TOrgEndpointResponse = z.infer<typeof OrgEndpointResponseSchema>;

/** Full FHIR Organization resource returned by the fhir-gql API. */
export const OrgResponseSchema = z.object({
  id: z.number(),
  active: z.boolean().nullish(),
  name: z.string().nullish(),
  // partOf — reference to a parent organization in the hierarchy
  partof_type: z.string().nullish(),
  partof_id: z.number().nullish(),
  partof_display: z.string().nullish(),
  // Sub-resource arrays
  identifier: z.array(OrgIdentifierResponseSchema).nullish(),
  type: z.array(OrgTypeResponseSchema).nullish(),
  alias: z.array(OrgAliasResponseSchema).nullish(),
  telecom: z.array(OrgTelecomResponseSchema).nullish(),
  address: z.array(OrgAddressResponseSchema).nullish(),
  contact: z.array(OrgContactResponseSchema).nullish(),
  endpoint: z.array(OrgEndpointResponseSchema).nullish(),
  // Audit fields injected by the fhir-gql server
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TOrgResponse = z.infer<typeof OrgResponseSchema>;

/**
 * Paginated list response — { total, limit, offset, data: TOrgResponse[] }.
 * `total` is the full count before pagination so clients can calculate page count.
 */
export const PaginatedOrgResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(OrgResponseSchema),
});
export type TPaginatedOrgResponse = z.infer<typeof PaginatedOrgResponseSchema>;
