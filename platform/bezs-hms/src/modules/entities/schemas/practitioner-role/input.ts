/**
 * PractitionerRole input/validation schemas.
 *
 * Layer: entities / schemas / practitioner-role
 *
 * Contains write-side Zod schemas: create DTO (with all 10 inline child arrays),
 * patch DTO (scalar fields only), and query schemas for list endpoints.
 *
 * Key difference from Practitioner: PractitionerRole accepts all child arrays
 * in the POST body — there are no separate sub-resource routes.
 *
 * Mirrors the fhir-gql Pydantic input models.
 */

import { z } from "zod";

// ── Child array input schemas ─────────────────────────────────────────────────

/** Input for a business identifier on a PractitionerRole. */
export const PractitionerRoleIdentifierInputSchema = z.object({
  use: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  value: z.string().min(1),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});
export type TPractitionerRoleIdentifierInput = z.infer<typeof PractitionerRoleIdentifierInputSchema>;

/** Input for a role code (CodeableConcept) on a PractitionerRole. */
export const PractitionerRoleCodeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TPractitionerRoleCodeInput = z.infer<typeof PractitionerRoleCodeInputSchema>;

/** Input for a specialty (CodeableConcept) on a PractitionerRole. */
export const PractitionerRoleSpecialtyInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TPractitionerRoleSpecialtyInput = z.infer<typeof PractitionerRoleSpecialtyInputSchema>;

/** Input for a Location reference on a PractitionerRole. */
export const PractitionerRoleLocationInputSchema = z.object({
  reference: z.string().min(1),
  reference_display: z.string().optional(),
  reference_type: z.string().optional(),
  reference_id: z.number().int().optional(),
});
export type TPractitionerRoleLocationInput = z.infer<typeof PractitionerRoleLocationInputSchema>;

/** Input for a HealthcareService reference on a PractitionerRole. */
export const PractitionerRoleHealthcareServiceInputSchema = z.object({
  reference: z.string().min(1),
  reference_display: z.string().optional(),
  reference_type: z.string().optional(),
  reference_id: z.number().int().optional(),
});
export type TPractitionerRoleHealthcareServiceInput = z.infer<typeof PractitionerRoleHealthcareServiceInputSchema>;

/** Input for a characteristic (CodeableConcept) on a PractitionerRole. */
export const PractitionerRoleCharacteristicInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TPractitionerRoleCharacteristicInput = z.infer<typeof PractitionerRoleCharacteristicInputSchema>;

/** Input for a communication language code on a PractitionerRole. */
export const PractitionerRoleCommunicationInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TPractitionerRoleCommunicationInput = z.infer<typeof PractitionerRoleCommunicationInputSchema>;

/** Input for a HumanName nested inside a contact. */
const PractitionerRoleContactNameInputSchema = z.object({
  use: z.string().optional(),
  text: z.string().optional(),
  family: z.string().optional(),
  given: z.array(z.string()).optional(),
  prefix: z.array(z.string()).optional(),
  suffix: z.array(z.string()).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

/** Input for a ContactPoint nested inside a contact. */
const PractitionerRoleContactTelecomInputSchema = z.object({
  system: z.string().optional(),
  value: z.string().optional(),
  use: z.string().optional(),
  rank: z.number().int().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

/** Input for an extended contact record (R5-style) on a PractitionerRole. */
export const PractitionerRoleContactInputSchema = z.object({
  // Purpose (CodeableConcept flat)
  purpose_system: z.string().optional(),
  purpose_code: z.string().optional(),
  purpose_display: z.string().optional(),
  purpose_text: z.string().optional(),
  // Address (flat columns)
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
  // Organisation reference
  organization: z.string().optional(),
  organization_display: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  // Nested children
  names: z.array(PractitionerRoleContactNameInputSchema).optional(),
  telecoms: z.array(PractitionerRoleContactTelecomInputSchema).optional(),
});
export type TPractitionerRoleContactInput = z.infer<typeof PractitionerRoleContactInputSchema>;

/** Input for an available-time slot nested inside an availability. */
const PractitionerRoleAvailableTimeInputSchema = z.object({
  days_of_week: z.array(z.string()).optional(),
  all_day: z.boolean().optional(),
  available_start_time: z.string().optional(),
  available_end_time: z.string().optional(),
});

/** Input for a not-available-time block nested inside an availability. */
const PractitionerRoleNotAvailableTimeInputSchema = z.object({
  description: z.string().optional(),
  during_start: z.string().optional(),
  during_end: z.string().optional(),
});

/** Input for an availability container (R5-style) on a PractitionerRole. */
export const PractitionerRoleAvailabilityInputSchema = z.object({
  available_times: z.array(PractitionerRoleAvailableTimeInputSchema).optional(),
  not_available_times: z.array(PractitionerRoleNotAvailableTimeInputSchema).optional(),
});
export type TPractitionerRoleAvailabilityInput = z.infer<typeof PractitionerRoleAvailabilityInputSchema>;

/** Input for an Endpoint reference on a PractitionerRole. */
export const PractitionerRoleEndpointInputSchema = z.object({
  reference: z.string().min(1),
  reference_display: z.string().optional(),
  reference_type: z.string().optional(),
  reference_id: z.number().int().optional(),
});
export type TPractitionerRoleEndpointInput = z.infer<typeof PractitionerRoleEndpointInputSchema>;

// ── Core CRUD ─────────────────────────────────────────────────────────────────

/**
 * Schema for creating a new PractitionerRole.
 * All 10 child arrays are accepted inline — the server creates them atomically.
 */
export const CreatePractitionerRoleValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  /** FHIR reference string, e.g. "Practitioner/30001". */
  practitioner: z.string().optional(),
  practitioner_display: z.string().optional(),
  /** FHIR reference string, e.g. "Organization/190001". */
  organization: z.string().optional(),
  organization_display: z.string().optional(),
  active: z.boolean().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  availability_exceptions: z.string().optional(),
  // Child arrays (all optional — omit to skip)
  identifier: z.array(PractitionerRoleIdentifierInputSchema).optional(),
  code: z.array(PractitionerRoleCodeInputSchema).optional(),
  specialty: z.array(PractitionerRoleSpecialtyInputSchema).optional(),
  location: z.array(PractitionerRoleLocationInputSchema).optional(),
  healthcare_service: z.array(PractitionerRoleHealthcareServiceInputSchema).optional(),
  characteristic: z.array(PractitionerRoleCharacteristicInputSchema).optional(),
  communication: z.array(PractitionerRoleCommunicationInputSchema).optional(),
  contact: z.array(PractitionerRoleContactInputSchema).optional(),
  availability: z.array(PractitionerRoleAvailabilityInputSchema).optional(),
  endpoint: z.array(PractitionerRoleEndpointInputSchema).optional(),
});
export type TCreatePractitionerRole = z.infer<typeof CreatePractitionerRoleValidationSchema>;

/** Patch-only scalar fields. Child arrays cannot be patched — recreate the role instead. */
const PractitionerRolePatchBaseSchema = z.object({
  active: z.boolean().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  availability_exceptions: z.string().optional(),
});

/** DTO type (API body) for PATCH /practitioner-roles/{id}. Does not include id. */
export const PractitionerRolePatchDtoSchema = PractitionerRolePatchBaseSchema;
export type TPractitionerRolePatchDto = z.infer<typeof PractitionerRolePatchDtoSchema>;

/** Full validation schema for an update action (includes id for controller routing). */
export const UpdatePractitionerRoleValidationSchema = PractitionerRolePatchBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdatePractitionerRole = z.infer<typeof UpdatePractitionerRoleValidationSchema>;

/** Query params for GET /practitioner-roles/. */
export const ListPractitionerRolesValidationSchema = z.object({
  active: z.boolean().optional(),
  /** Filter by linked Practitioner integer ID. */
  practitioner_id: z.number().int().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListPractitionerRolesQuery = z.infer<typeof ListPractitionerRolesValidationSchema>;

/** Query params for GET /practitioner-roles/booking. */
export const ListPractitionerRolesForBookingValidationSchema = z.object({
  /** SNOMED specialty code, e.g. '394814009'. */
  specialty_code: z.string().optional(),
  /** Day of week filter: mon|tue|wed|thu|fri|sat|sun. */
  day_of_week: z.string().optional(),
  active: z.boolean().optional(),
  /** Filter by organisation ID. */
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListPractitionerRolesForBookingQuery = z.infer<typeof ListPractitionerRolesForBookingValidationSchema>;

/** Schema for fetching a single PractitionerRole by ID. */
export const GetByIdPractitionerRoleValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TGetByIdPractitionerRole = z.infer<typeof GetByIdPractitionerRoleValidationSchema>;

/** Schema for deleting a PractitionerRole by ID. */
export const DeletePractitionerRoleValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TDeletePractitionerRole = z.infer<typeof DeletePractitionerRoleValidationSchema>;
