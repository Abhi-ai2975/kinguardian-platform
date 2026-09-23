/**
 * Organization input validation schemas and DTO types.
 *
 * Layer: entities / schemas / organization
 *
 * Mirrors fhir-gql's input Pydantic models exactly.
 * Covers: input sub-schemas, create / patch / list / getById / delete validation schemas.
 */

import { z } from "zod";

// ── Input sub-schemas ──────────────────────────────────────────────────────────

/** FHIR coding used for Organization.type entries. */
export const OrgTypeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TOrgTypeInput = z.infer<typeof OrgTypeInputSchema>;

/** Single FHIR Identifier to attach to an Organization on create. */
export const OrgIdentifierInputSchema = z.object({
  /**
   * Identifier use, e.g. usual | official | temp | secondary | old.
   * Sourced from the FHIR terminology server (resource="Patient" field=
   * "identifier.use") via TerminologySelect — not a fixed enum. fhir-gql
   * itself accepts any string here, so the schema shouldn't over-constrain it.
   */
  use: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  /** URI namespace of the identifier value (e.g. http://hl7.org/fhir/sid/us-npi). */
  system: z.string().optional(),
  value: z.string().min(1, "Identifier value is required"),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  /** Display name of the organization that issued this identifier. */
  assigner: z.string().optional(),
});
export type TOrgIdentifierInput = z.infer<typeof OrgIdentifierInputSchema>;

/**
 * Contact point (phone, email, etc.) for the organization.
 * `system`/`use` are sourced from the terminology server (resource="Patient"
 * field="telecom.system"/"telecom.use") via TerminologySelect — not fixed
 * enums; fhir-gql itself accepts any string for these fields.
 */
export const OrgTelecomInputSchema = z.object({
  system: z.string(),
  value: z.string().min(1),
  use: z.string().optional(),
  rank: z.number().int().min(1).optional(),
});
export type TOrgTelecomInput = z.infer<typeof OrgTelecomInputSchema>;

/**
 * Postal or physical address for the organization.
 * `use`/`type` are sourced from the terminology server (resource="Patient"
 * field="address.use"/"address.type") via TerminologySelect.
 */
export const OrgAddressInputSchema = z.object({
  use: z.string().optional(),
  type: z.string().optional(),
  text: z.string().optional(),
  /** Street address lines, e.g. ["123 Main St", "Suite 400"]. */
  line: z.array(z.string()).optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
});
export type TOrgAddressInput = z.infer<typeof OrgAddressInputSchema>;

/**
 * Telecom entry nested inside a contact person (not the org-level telecom).
 * `system`/`use` are sourced from the terminology server via TerminologySelect
 * (same bindings as OrgTelecomInputSchema).
 */
export const OrgContactTelecomInputSchema = z.object({
  system: z.string(),
  value: z.string().min(1),
  use: z.string().optional(),
  rank: z.number().int().min(1).optional(),
});
export type TOrgContactTelecomInput = z.infer<typeof OrgContactTelecomInputSchema>;

/**
 * Contact person for the organization (admin, billing, clinical, etc.).
 * Mirrors fhir-gql's OrgContactInput with flattened HumanName and Address fields.
 */
export const OrgContactInputSchema = z.object({
  purpose_system: z.string().optional(),
  purpose_code: z.string().optional(),
  purpose_display: z.string().optional(),
  purpose_text: z.string().optional(),
  /**
   * HumanName use, e.g. usual | official | temp | nickname | anonymous |
   * old | maiden. Sourced from the terminology server (resource="Patient"
   * field="name.use") via TerminologySelect.
   */
  name_use: z.string().optional(),
  name_text: z.string().optional(),
  name_family: z.string().optional(),
  name_given: z.array(z.string()).optional(),
  name_prefix: z.array(z.string()).optional(),
  name_suffix: z.array(z.string()).optional(),
  address_use: z.string().optional(),
  address_type: z.string().optional(),
  address_text: z.string().optional(),
  address_line: z.array(z.string()).optional(),
  address_city: z.string().optional(),
  address_district: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),
  telecom: z.array(OrgContactTelecomInputSchema).optional(),
});
export type TOrgContactInput = z.infer<typeof OrgContactInputSchema>;

/** Technical endpoint reference to attach to the organization. */
export const OrgEndpointInputSchema = z.object({
  /** FHIR reference string, e.g. "Endpoint/1". */
  reference: z.string().min(1, "Reference is required"),
  reference_display: z.string().optional(),
});
export type TOrgEndpointInput = z.infer<typeof OrgEndpointInputSchema>;

// ── Input validation schemas ───────────────────────────────────────────────────

/**
 * Full schema for creating an Organization.
 * Mirrors fhir-gql's RegisterOrgSchema — name and type are required;
 * all sub-resource arrays are optional.
 */
export const RegisterOrgValidationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.array(OrgTypeInputSchema).min(1, "At least one organization type is required"),
  active: z.boolean().optional().default(true),
  /** FHIR reference to parent org, e.g. "Organization/190001". */
  partof: z.string().optional(),
  partof_display: z.string().optional(),
  identifier: z.array(OrgIdentifierInputSchema).optional(),
  alias: z.array(z.object({ value: z.string().min(1) })).optional(),
  telecom: z.array(OrgTelecomInputSchema).optional(),
  address: z.array(OrgAddressInputSchema).optional(),
  contact: z.array(OrgContactInputSchema).optional(),
  endpoint: z.array(OrgEndpointInputSchema).optional(),
  /** Better Auth user ID of the creator — scopes the resource to a user. */
  user_id: z.string().optional(),
  /** Better Auth active organization ID — scopes the resource to a tenant. */
  org_id: z.string().optional(),
});
export type TRegisterOrg = z.infer<typeof RegisterOrgValidationSchema>;

/**
 * Base patch fields (no id, no refinement) — used for the service dto and
 * as the foundation for the full validation schema. Defined separately because
 * .omit() cannot be called on a schema that already has a .refine() applied.
 */
const PatchOrgBaseSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().min(1).optional(),
  partof_display: z.string().optional(),
});

/** Dto variant (no id) — used by the service interface update method. */
export const PatchOrgDtoSchema = PatchOrgBaseSchema;
export type TPatchOrgDto = z.infer<typeof PatchOrgDtoSchema>;

/**
 * Full patch validation schema — includes id and enforces that at least one
 * patchable field is present. Child arrays are NOT patchable via PATCH — delete
 * and re-create to correct those.
 */
export const PatchOrgValidationSchema = PatchOrgBaseSchema.extend({
  id: z.number(),
}).refine(
  ({ active, name, partof_display }) =>
    active !== undefined || name !== undefined || partof_display !== undefined,
  { message: "At least one field must be provided for update" },
);
export type TPatchOrg = z.infer<typeof PatchOrgValidationSchema>;

/** Query parameters for listing organizations (server-side filtering + pagination). */
export const ListOrgsValidationSchema = z.object({
  name: z.string().optional(),
  active: z.boolean().optional(),
  /** Filter by owning user — matches the JWT subject stored on each resource. */
  user_id: z.string().optional(),
  /** Filter by tenant organization ID — scopes results to a single tenant. */
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListOrgsQuery = z.infer<typeof ListOrgsValidationSchema>;

export const GetOrgByIdValidationSchema = z.object({ id: z.number() });
export type TGetOrgById = z.infer<typeof GetOrgByIdValidationSchema>;

export const DeleteOrgValidationSchema = z.object({ id: z.number() });
export type TDeleteOrg = z.infer<typeof DeleteOrgValidationSchema>;
