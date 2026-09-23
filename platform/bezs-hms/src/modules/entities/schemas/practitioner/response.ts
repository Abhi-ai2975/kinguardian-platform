/**
 * Practitioner response schemas.
 *
 * Layer: entities / schemas / practitioner
 *
 * Mirrors the fhir-gql plain JSON response shapes (Accept: application/json).
 * All optional fields use .nullish() — the API returns explicit JSON null for
 * absent fields, not missing keys.
 *
 * Reference: https://hl7.org/fhir/R4/practitioner.html
 */

import { z } from "zod";

// ── Sub-resource response schemas ─────────────────────────────────────────────

/** A single HumanName record on a Practitioner. */
export const PractitionerNameResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  use: z.string().nullish(),
  text: z.string().nullish(),
  family: z.string().nullish(),
  given: z.array(z.string()).nullish(),
  prefix: z.array(z.string()).nullish(),
  suffix: z.array(z.string()).nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TPractitionerNameResponse = z.infer<typeof PractitionerNameResponseSchema>;

/** A business identifier on a Practitioner (NPI, license, DEA, etc.). */
export const PractitionerIdentifierResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
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
export type TPractitionerIdentifierResponse = z.infer<typeof PractitionerIdentifierResponseSchema>;

/** A ContactPoint (phone, email, etc.) on a Practitioner. */
export const PractitionerTelecomResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TPractitionerTelecomResponse = z.infer<typeof PractitionerTelecomResponseSchema>;

/** An Address record on a Practitioner. */
export const PractitionerAddressResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
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
export type TPractitionerAddressResponse = z.infer<typeof PractitionerAddressResponseSchema>;

/** A photo Attachment record on a Practitioner. */
export const PractitionerPhotoResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  content_type: z.string().nullish(),
  language: z.string().nullish(),
  data: z.string().nullish(),
  url: z.string().nullish(),
  size: z.number().nullish(),
  hash: z.string().nullish(),
  title: z.string().nullish(),
  creation: z.string().nullish(),
});
export type TPractitionerPhotoResponse = z.infer<typeof PractitionerPhotoResponseSchema>;

/** An identifier nested inside a Qualification record (e.g. license number). */
export const QualificationIdentifierResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
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
export type TQualificationIdentifierResponse = z.infer<typeof QualificationIdentifierResponseSchema>;

/** A qualification (certification, license, training) on a Practitioner. */
export const PractitionerQualificationResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  /** Nested identifiers on the qualification itself (e.g. license number). */
  identifier: z.array(QualificationIdentifierResponseSchema).nullish(),
  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  code_text: z.string().nullish(),
  status_system: z.string().nullish(),
  status_code: z.string().nullish(),
  status_display: z.string().nullish(),
  status_text: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  issuer_type: z.string().nullish(),
  issuer_id: z.number().nullish(),
  issuer_display: z.string().nullish(),
});
export type TPractitionerQualificationResponse = z.infer<typeof PractitionerQualificationResponseSchema>;

/** A communication language preference on a Practitioner. */
export const PractitionerCommunicationResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  language_system: z.string().nullish(),
  language_code: z.string().nullish(),
  language_display: z.string().nullish(),
  language_text: z.string().nullish(),
  preferred: z.boolean().nullish(),
});
export type TPractitionerCommunicationResponse = z.infer<typeof PractitionerCommunicationResponseSchema>;

// ── Top-level response schemas ─────────────────────────────────────────────────

/** Full plain JSON response for a single Practitioner resource. */
export const PractitionerResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  active: z.boolean().nullish(),
  gender: z.string().nullish(),
  birth_date: z.string().nullish(),
  deceased_boolean: z.boolean().nullish(),
  deceased_datetime: z.string().nullish(),
  name: z.array(PractitionerNameResponseSchema).nullish(),
  identifier: z.array(PractitionerIdentifierResponseSchema).nullish(),
  telecom: z.array(PractitionerTelecomResponseSchema).nullish(),
  address: z.array(PractitionerAddressResponseSchema).nullish(),
  photo: z.array(PractitionerPhotoResponseSchema).nullish(),
  qualification: z.array(PractitionerQualificationResponseSchema).nullish(),
  communication: z.array(PractitionerCommunicationResponseSchema).nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TPractitionerResponse = z.infer<typeof PractitionerResponseSchema>;

/** Paginated list response for GET /practitioners. */
export const PaginatedPractitionerResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(PractitionerResponseSchema),
});
export type TPaginatedPractitionerResponse = z.infer<typeof PaginatedPractitionerResponseSchema>;

// ── Sub-resource list response schemas ───────────────────────────────────────
// Each sub-resource list endpoint returns { data: [...], total: N } — no limit/offset.

/** Response shape for GET /practitioners/{id}/names. */
export const PractitionerNameListResponseSchema = z.object({
  data: z.array(PractitionerNameResponseSchema),
  total: z.number(),
});
export type TPractitionerNameListResponse = z.infer<typeof PractitionerNameListResponseSchema>;

/** Response shape for GET /practitioners/{id}/identifiers. */
export const PractitionerIdentifierListResponseSchema = z.object({
  data: z.array(PractitionerIdentifierResponseSchema),
  total: z.number(),
});
export type TPractitionerIdentifierListResponse = z.infer<typeof PractitionerIdentifierListResponseSchema>;

/** Response shape for GET /practitioners/{id}/telecom. */
export const PractitionerTelecomListResponseSchema = z.object({
  data: z.array(PractitionerTelecomResponseSchema),
  total: z.number(),
});
export type TPractitionerTelecomListResponse = z.infer<typeof PractitionerTelecomListResponseSchema>;

/** Response shape for GET /practitioners/{id}/addresses. */
export const PractitionerAddressListResponseSchema = z.object({
  data: z.array(PractitionerAddressResponseSchema),
  total: z.number(),
});
export type TPractitionerAddressListResponse = z.infer<typeof PractitionerAddressListResponseSchema>;

/** Response shape for GET /practitioners/{id}/photos. */
export const PractitionerPhotoListResponseSchema = z.object({
  data: z.array(PractitionerPhotoResponseSchema),
  total: z.number(),
});
export type TPractitionerPhotoListResponse = z.infer<typeof PractitionerPhotoListResponseSchema>;

/** Response shape for GET /practitioners/{id}/qualifications. */
export const PractitionerQualificationListResponseSchema = z.object({
  data: z.array(PractitionerQualificationResponseSchema),
  total: z.number(),
});
export type TPractitionerQualificationListResponse = z.infer<typeof PractitionerQualificationListResponseSchema>;

/** Response shape for GET /practitioners/{id}/communications. */
export const PractitionerCommunicationListResponseSchema = z.object({
  data: z.array(PractitionerCommunicationResponseSchema),
  total: z.number(),
});
export type TPractitionerCommunicationListResponse = z.infer<typeof PractitionerCommunicationListResponseSchema>;
