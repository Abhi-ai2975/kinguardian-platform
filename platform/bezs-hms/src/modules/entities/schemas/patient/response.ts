/**
 * Patient response schemas.
 *
 * Layer: entities / schemas / patient
 *
 * Defines Zod schemas for every plain JSON response shape the fhir-gql Patient
 * API returns — the top-level PatientResponse (with all nine nested sub-resource
 * arrays) plus individual sub-resource item shapes and their list wrappers.
 *
 * All optional fields use `.nullish()` (not `.optional()`) because Python's
 * `Optional[X] = None` serialises as explicit JSON `null`, not a missing key.
 * `.nullish()` accepts both `null` and `undefined`, preventing parse failures.
 *
 * Sub-resource list responses use `{ data: [...], total: N }` — the fhir-gql
 * returns all items without pagination for sub-resources.
 */

import { z } from "zod";

// ── Sub-resource: Name ────────────────────────────────────────────────────────

/**
 * A single HumanName entry belonging to a Patient.
 * Maps to the `patient_name` table on the fhir-server.
 */
export const PatientNameResponseSchema = z.object({
  id: z.number(),
  use: z.string().nullish(),
  text: z.string().nullish(),
  family: z.string().nullish(),
  given: z.array(z.string()).nullish(),
  prefix: z.array(z.string()).nullish(),
  suffix: z.array(z.string()).nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TPatientNameResponse = z.infer<typeof PatientNameResponseSchema>;

export const PatientNamesListSchema = z.object({
  total: z.number(),
  data: z.array(PatientNameResponseSchema),
});
export type TPatientNamesList = z.infer<typeof PatientNamesListSchema>;

// ── Sub-resource: Identifier ──────────────────────────────────────────────────

/**
 * A single Identifier entry belonging to a Patient.
 */
export const PatientIdentifierResponseSchema = z.object({
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
export type TPatientIdentifierResponse = z.infer<typeof PatientIdentifierResponseSchema>;

export const PatientIdentifiersListSchema = z.object({
  total: z.number(),
  data: z.array(PatientIdentifierResponseSchema),
});
export type TPatientIdentifiersList = z.infer<typeof PatientIdentifiersListSchema>;

// ── Sub-resource: Telecom ─────────────────────────────────────────────────────

/**
 * A single ContactPoint (telecom) entry belonging to a Patient.
 */
export const PatientTelecomResponseSchema = z.object({
  id: z.number(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TPatientTelecomResponse = z.infer<typeof PatientTelecomResponseSchema>;

export const PatientTelecomListSchema = z.object({
  total: z.number(),
  data: z.array(PatientTelecomResponseSchema),
});
export type TPatientTelecomList = z.infer<typeof PatientTelecomListSchema>;

// ── Sub-resource: Address ─────────────────────────────────────────────────────

/**
 * A single Address entry belonging to a Patient.
 */
export const PatientAddressResponseSchema = z.object({
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
export type TPatientAddressResponse = z.infer<typeof PatientAddressResponseSchema>;

export const PatientAddressesListSchema = z.object({
  total: z.number(),
  data: z.array(PatientAddressResponseSchema),
});
export type TPatientAddressesList = z.infer<typeof PatientAddressesListSchema>;

// ── Sub-resource: Photo ───────────────────────────────────────────────────────

/**
 * A single Attachment (photo) entry belonging to a Patient.
 */
export const PatientPhotoResponseSchema = z.object({
  id: z.number(),
  content_type: z.string().nullish(),
  language: z.string().nullish(),
  data: z.string().nullish(),
  url: z.string().nullish(),
  size: z.number().nullish(),
  hash: z.string().nullish(),
  title: z.string().nullish(),
  creation: z.string().nullish(),
});
export type TPatientPhotoResponse = z.infer<typeof PatientPhotoResponseSchema>;

export const PatientPhotosListSchema = z.object({
  total: z.number(),
  data: z.array(PatientPhotoResponseSchema),
});
export type TPatientPhotosList = z.infer<typeof PatientPhotosListSchema>;

// ── Sub-resource: Contact ─────────────────────────────────────────────────────

/**
 * A single relationship CodeableConcept nested inside a Patient contact.
 */
export const PatientContactRelationshipResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TPatientContactRelationshipResponse = z.infer<typeof PatientContactRelationshipResponseSchema>;

/**
 * A single telecom ContactPoint nested inside a Patient contact.
 */
export const PatientContactTelecomResponseSchema = z.object({
  id: z.number(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TPatientContactTelecomResponse = z.infer<typeof PatientContactTelecomResponseSchema>;

/**
 * A single contact (next-of-kin / guardian / emergency contact) belonging to a Patient.
 * Includes nested relationship[] and telecom[] arrays.
 */
export const PatientContactResponseSchema = z.object({
  id: z.number(),
  relationship: z.array(PatientContactRelationshipResponseSchema).nullish(),
  name_use: z.string().nullish(),
  name_text: z.string().nullish(),
  name_family: z.string().nullish(),
  name_given: z.array(z.string()).nullish(),
  name_prefix: z.array(z.string()).nullish(),
  name_suffix: z.array(z.string()).nullish(),
  telecom: z.array(PatientContactTelecomResponseSchema).nullish(),
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
  gender: z.string().nullish(),
  organization_type: z.string().nullish(),
  organization_id: z.number().nullish(),
  organization_display: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TPatientContactResponse = z.infer<typeof PatientContactResponseSchema>;

export const PatientContactsListSchema = z.object({
  total: z.number(),
  data: z.array(PatientContactResponseSchema),
});
export type TPatientContactsList = z.infer<typeof PatientContactsListSchema>;

// ── Sub-resource: Communication ───────────────────────────────────────────────

/**
 * A single communication language preference belonging to a Patient.
 */
export const PatientCommunicationResponseSchema = z.object({
  id: z.number(),
  language_system: z.string().nullish(),
  language_code: z.string().nullish(),
  language_display: z.string().nullish(),
  language_text: z.string().nullish(),
  preferred: z.boolean().nullish(),
});
export type TPatientCommunicationResponse = z.infer<typeof PatientCommunicationResponseSchema>;

export const PatientCommunicationsListSchema = z.object({
  total: z.number(),
  data: z.array(PatientCommunicationResponseSchema),
});
export type TPatientCommunicationsList = z.infer<typeof PatientCommunicationsListSchema>;

// ── Sub-resource: General Practitioner ───────────────────────────────────────

/**
 * A single generalPractitioner reference belonging to a Patient.
 */
export const PatientGeneralPractitionerResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TPatientGeneralPractitionerResponse = z.infer<typeof PatientGeneralPractitionerResponseSchema>;

export const PatientGeneralPractitionersListSchema = z.object({
  total: z.number(),
  data: z.array(PatientGeneralPractitionerResponseSchema),
});
export type TPatientGeneralPractitionersList = z.infer<typeof PatientGeneralPractitionersListSchema>;

// ── Sub-resource: Link ────────────────────────────────────────────────────────

/**
 * A single link to another Patient or RelatedPerson belonging to a Patient.
 */
export const PatientLinkResponseSchema = z.object({
  id: z.number(),
  other_type: z.string().nullish(),
  other_id: z.number().nullish(),
  other_display: z.string().nullish(),
  type: z.string().nullish(),
});
export type TPatientLinkResponse = z.infer<typeof PatientLinkResponseSchema>;

export const PatientLinksListSchema = z.object({
  total: z.number(),
  data: z.array(PatientLinkResponseSchema),
});
export type TPatientLinksList = z.infer<typeof PatientLinksListSchema>;

// ── Top-level Patient response ────────────────────────────────────────────────

/**
 * Full plain JSON response for a single Patient resource.
 *
 * Returned by GET /patients/{id}, POST /patients, PATCH /patients/{id}, and
 * GET /patients/me. Includes all scalar fields and all nine nested sub-resource
 * arrays (populated by the fhir-server on every fetch).
 */
export const PatientResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  active: z.boolean().nullish(),
  gender: z.string().nullish(),
  birth_date: z.string().nullish(),
  deceased_boolean: z.boolean().nullish(),
  deceased_datetime: z.string().nullish(),
  marital_status_system: z.string().nullish(),
  marital_status_code: z.string().nullish(),
  marital_status_display: z.string().nullish(),
  marital_status_text: z.string().nullish(),
  multiple_birth_boolean: z.boolean().nullish(),
  multiple_birth_integer: z.number().nullish(),
  managing_organization_type: z.string().nullish(),
  managing_organization_id: z.number().nullish(),
  managing_organization_display: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
  // Nested sub-resource arrays — populated by the fhir-server on every GET.
  name: z.array(PatientNameResponseSchema).nullish(),
  identifier: z.array(PatientIdentifierResponseSchema).nullish(),
  telecom: z.array(PatientTelecomResponseSchema).nullish(),
  address: z.array(PatientAddressResponseSchema).nullish(),
  photo: z.array(PatientPhotoResponseSchema).nullish(),
  contact: z.array(PatientContactResponseSchema).nullish(),
  communication: z.array(PatientCommunicationResponseSchema).nullish(),
  general_practitioner: z.array(PatientGeneralPractitionerResponseSchema).nullish(),
  link: z.array(PatientLinkResponseSchema).nullish(),
});
export type TPatientResponse = z.infer<typeof PatientResponseSchema>;

/**
 * Paginated list response for GET /patients.
 */
export const PaginatedPatientResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(PatientResponseSchema),
});
export type TPaginatedPatientResponse = z.infer<typeof PaginatedPatientResponseSchema>;
