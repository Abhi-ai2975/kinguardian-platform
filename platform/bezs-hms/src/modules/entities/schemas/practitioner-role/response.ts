/**
 * PractitionerRole response schemas.
 *
 * Layer: entities / schemas / practitioner-role
 *
 * Mirrors the fhir-gql plain JSON response shapes (Accept: application/json).
 * All optional fields use .nullish() — the API returns explicit JSON null for
 * absent fields, not missing keys.
 *
 * Sub-resources (code, specialty, location, etc.) are always embedded in the
 * top-level PractitionerRole response — there are no separate sub-resource
 * endpoints, unlike the Practitioner resource.
 *
 * Reference: https://hl7.org/fhir/R4/practitionerrole.html
 */

import { z } from "zod";

// ── Child array sub-schemas ───────────────────────────────────────────────────

/** A business identifier on a PractitionerRole. */
export const PractitionerRoleIdentifierResponseSchema = z.object({
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
export type TPractitionerRoleIdentifierResponse = z.infer<typeof PractitionerRoleIdentifierResponseSchema>;

/** A role code (CodeableConcept) on a PractitionerRole. */
export const PractitionerRoleCodeResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TPractitionerRoleCodeResponse = z.infer<typeof PractitionerRoleCodeResponseSchema>;

/** A specialty (CodeableConcept) on a PractitionerRole. */
export const PractitionerRoleSpecialtyResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TPractitionerRoleSpecialtyResponse = z.infer<typeof PractitionerRoleSpecialtyResponseSchema>;

/** A Location reference on a PractitionerRole. */
export const PractitionerRoleLocationResponseSchema = z.object({
  id: z.number(),
  reference: z.string().nullish(),
  reference_display: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
});
export type TPractitionerRoleLocationResponse = z.infer<typeof PractitionerRoleLocationResponseSchema>;

/** A HealthcareService reference on a PractitionerRole. */
export const PractitionerRoleHealthcareServiceResponseSchema = z.object({
  id: z.number(),
  reference: z.string().nullish(),
  reference_display: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
});
export type TPractitionerRoleHealthcareServiceResponse = z.infer<typeof PractitionerRoleHealthcareServiceResponseSchema>;

/** A characteristic (CodeableConcept) on a PractitionerRole. */
export const PractitionerRoleCharacteristicResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TPractitionerRoleCharacteristicResponse = z.infer<typeof PractitionerRoleCharacteristicResponseSchema>;

/** A communication (BCP-47 language code) on a PractitionerRole. */
export const PractitionerRoleCommunicationResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TPractitionerRoleCommunicationResponse = z.infer<typeof PractitionerRoleCommunicationResponseSchema>;

/** A HumanName nested inside a PractitionerRole contact. */
export const PractitionerRoleContactNameResponseSchema = z.object({
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
export type TPractitionerRoleContactNameResponse = z.infer<typeof PractitionerRoleContactNameResponseSchema>;

/** A ContactPoint nested inside a PractitionerRole contact. */
export const PractitionerRoleContactTelecomResponseSchema = z.object({
  id: z.number(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TPractitionerRoleContactTelecomResponse = z.infer<typeof PractitionerRoleContactTelecomResponseSchema>;

/** An extended contact record (R5-style) on a PractitionerRole. */
export const PractitionerRoleContactResponseSchema = z.object({
  id: z.number(),
  // Purpose (CodeableConcept flat)
  purpose_system: z.string().nullish(),
  purpose_code: z.string().nullish(),
  purpose_display: z.string().nullish(),
  purpose_text: z.string().nullish(),
  // Address (flat columns)
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
  // Organisation reference
  organization: z.string().nullish(),
  organization_display: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  // Nested child arrays
  names: z.array(PractitionerRoleContactNameResponseSchema).nullish(),
  telecoms: z.array(PractitionerRoleContactTelecomResponseSchema).nullish(),
});
export type TPractitionerRoleContactResponse = z.infer<typeof PractitionerRoleContactResponseSchema>;

/** An available-time slot nested inside a PractitionerRole availability. */
export const PractitionerRoleAvailableTimeResponseSchema = z.object({
  id: z.number(),
  days_of_week: z.array(z.string()).nullish(),
  all_day: z.boolean().nullish(),
  available_start_time: z.string().nullish(),
  available_end_time: z.string().nullish(),
});
export type TPractitionerRoleAvailableTimeResponse = z.infer<typeof PractitionerRoleAvailableTimeResponseSchema>;

/** A not-available-time block nested inside a PractitionerRole availability. */
export const PractitionerRoleNotAvailableTimeResponseSchema = z.object({
  id: z.number(),
  description: z.string().nullish(),
  during_start: z.string().nullish(),
  during_end: z.string().nullish(),
});
export type TPractitionerRoleNotAvailableTimeResponse = z.infer<typeof PractitionerRoleNotAvailableTimeResponseSchema>;

/**
 * An availability container (R5-style grouping) on a PractitionerRole.
 * Groups available_times and not_available_times together.
 */
export const PractitionerRoleAvailabilityResponseSchema = z.object({
  id: z.number(),
  available_times: z.array(PractitionerRoleAvailableTimeResponseSchema).nullish(),
  not_available_times: z.array(PractitionerRoleNotAvailableTimeResponseSchema).nullish(),
});
export type TPractitionerRoleAvailabilityResponse = z.infer<typeof PractitionerRoleAvailabilityResponseSchema>;

/** An Endpoint reference on a PractitionerRole. */
export const PractitionerRoleEndpointResponseSchema = z.object({
  id: z.number(),
  reference: z.string().nullish(),
  reference_display: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
});
export type TPractitionerRoleEndpointResponse = z.infer<typeof PractitionerRoleEndpointResponseSchema>;

// ── Top-level response ────────────────────────────────────────────────────────

/**
 * Full PractitionerRole plain-JSON response from fhir-gql.
 * All 10 child arrays are embedded inline — there are no sub-resource routes.
 */
export const PractitionerRoleResponseSchema = z.object({
  id: z.number(),
  active: z.boolean().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  // Practitioner reference (split by fhir-server)
  practitioner_ref_id: z.number().nullish(),
  practitioner_display: z.string().nullish(),
  // Organisation reference
  organization_type: z.string().nullish(),
  organization_id: z.number().nullish(),
  organization_display: z.string().nullish(),
  availability_exceptions: z.string().nullish(),
  // Child arrays
  identifier: z.array(PractitionerRoleIdentifierResponseSchema).nullish(),
  code: z.array(PractitionerRoleCodeResponseSchema).nullish(),
  specialty: z.array(PractitionerRoleSpecialtyResponseSchema).nullish(),
  location: z.array(PractitionerRoleLocationResponseSchema).nullish(),
  healthcare_service: z.array(PractitionerRoleHealthcareServiceResponseSchema).nullish(),
  characteristic: z.array(PractitionerRoleCharacteristicResponseSchema).nullish(),
  communication: z.array(PractitionerRoleCommunicationResponseSchema).nullish(),
  contact: z.array(PractitionerRoleContactResponseSchema).nullish(),
  availability: z.array(PractitionerRoleAvailabilityResponseSchema).nullish(),
  endpoint: z.array(PractitionerRoleEndpointResponseSchema).nullish(),
  // Tenant scoping
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  // Audit fields
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TPractitionerRoleResponse = z.infer<typeof PractitionerRoleResponseSchema>;

/** Paginated wrapper returned by GET /practitioner-roles/. */
export const PaginatedPractitionerRoleResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(PractitionerRoleResponseSchema),
});
export type TPaginatedPractitionerRoleResponse = z.infer<typeof PaginatedPractitionerRoleResponseSchema>;

// ── Booking-enriched response ─────────────────────────────────────────────────

/**
 * Embedded Practitioner detail included in booking responses.
 * Contains name, photo, gender, qualifications, telecom, and languages for booking UIs.
 * Fields: birth_date, telecom, languages added when fhir-gql enriched the /booking endpoint.
 */
export const PractitionerDetailResponseSchema = z.object({
  id: z.number().nullish(),
  gender: z.string().nullish(),
  birth_date: z.string().nullish(),
  name: z
    .object({
      family: z.string().nullish(),
      given: z.array(z.string()).nullish(),
      prefix: z.array(z.string()).nullish(),
    })
    .nullish(),
  /** ContactPoint array from the Practitioner resource (phone, email, etc.). */
  telecom: z
    .array(
      z.object({
        system: z.string().nullish(),
        value: z.string().nullish(),
        use: z.string().nullish(),
        rank: z.number().nullish(),
      }),
    )
    .nullish(),
  /** BCP-47 language entries from the Practitioner's communication list. */
  languages: z
    .array(
      z.object({
        code: z.string().nullish(),
        display: z.string().nullish(),
        preferred: z.boolean().nullish(),
      }),
    )
    .nullish(),
  qualifications: z
    .array(
      z.object({
        id: z.number().optional(),
        code_system: z.string().nullish(),
        code_code: z.string().nullish(),
        code_display: z.string().nullish(),
        code_text: z.string().nullish(),
      }),
    )
    .nullish(),
  photo_url: z.string().nullish(),
});
export type TPractitionerDetailResponse = z.infer<typeof PractitionerDetailResponseSchema>;

/**
 * Location reference enriched with resolved Location data for booking UIs.
 * The fhir-server joins name, address, and phone from the Location resource.
 */
export const PractitionerRoleBookingLocationResponseSchema = PractitionerRoleLocationResponseSchema.extend({
  name: z.string().nullish(),
  address_text: z.string().nullish(),
  address_city: z.string().nullish(),
  address_state: z.string().nullish(),
  address_postal_code: z.string().nullish(),
  address_country: z.string().nullish(),
  phone: z.string().nullish(),
});
export type TPractitionerRoleBookingLocationResponse = z.infer<typeof PractitionerRoleBookingLocationResponseSchema>;

/**
 * HealthcareService reference enriched with resolved HealthcareService data for booking UIs.
 * The fhir-server joins name, category, and availability info from the HealthcareService resource.
 */
export const PractitionerRoleBookingHealthcareServiceResponseSchema = PractitionerRoleHealthcareServiceResponseSchema.extend({
  name: z.string().nullish(),
  comment: z.string().nullish(),
  appointment_required: z.boolean().nullish(),
  category: z.string().nullish(),
  availability_exceptions: z.string().nullish(),
});
export type TPractitionerRoleBookingHealthcareServiceResponse = z.infer<typeof PractitionerRoleBookingHealthcareServiceResponseSchema>;

/**
 * Booking-enriched PractitionerRole response (GET /practitioner-roles/booking).
 * Extends the base response with embedded practitioner detail and enriched
 * Location / HealthcareService data (name, address, phone resolved server-side).
 */
export const PractitionerRoleBookingResponseSchema = PractitionerRoleResponseSchema.extend({
  practitioner_detail: PractitionerDetailResponseSchema.nullish(),
  /** Enriched with name, address, and phone from the joined Location resource. */
  location: z.array(PractitionerRoleBookingLocationResponseSchema).nullish(),
  /** Enriched with name, category, and availability from the joined HealthcareService resource. */
  healthcare_service: z.array(PractitionerRoleBookingHealthcareServiceResponseSchema).nullish(),
});
export type TPractitionerRoleBookingResponse = z.infer<typeof PractitionerRoleBookingResponseSchema>;

/** Paginated wrapper returned by GET /practitioner-roles/booking. */
export const PaginatedPractitionerRoleBookingResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(PractitionerRoleBookingResponseSchema),
});
export type TPaginatedPractitionerRoleBookingResponse = z.infer<typeof PaginatedPractitionerRoleBookingResponseSchema>;
