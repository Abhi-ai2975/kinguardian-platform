/**
 * HealthcareService input validation schemas and DTO types.
 *
 * Layer: entities / schemas / healthcare-service
 *
 * Mirrors fhir-gql's input Pydantic models exactly (app/schemas/healthcare_service/input.py).
 * Covers: input sub-schemas, create / patch / list / getById / delete validation schemas.
 *
 * All coded/enum-shaped fields (identifier.use, telecom.system/use, etc.) are
 * plain `z.string()` — never `z.enum([...])`. fhir-gql itself types these as
 * `Optional[str]`, not backend-enforced enums, and the values come from the
 * live FHIR terminology server via TerminologySelect, which may return codes
 * outside any hand-typed list. Learned from the Organization/Location schema
 * pass — applied from the start here instead of retrofitting.
 */

import { z } from "zod";

// ── Input sub-schemas ──────────────────────────────────────────────────────────

/** Single FHIR Identifier to attach to a HealthcareService on create. */
export const HealthcareServiceIdentifierInputSchema = z.object({
  use: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  value: z.string().min(1, "Identifier value is required"),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});
export type THealthcareServiceIdentifierInput = z.infer<
  typeof HealthcareServiceIdentifierInputSchema
>;

/**
 * Shared shape for every simple CodeableConcept sub-resource (category, type,
 * specialty, serviceProvisionCode, program, characteristic, communication,
 * referralMethod) — all are `{coding_system?, coding_code?, coding_display?, text?}`.
 */
export const HealthcareServiceCodeableConceptInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type THealthcareServiceCodeableConceptInput = z.infer<
  typeof HealthcareServiceCodeableConceptInputSchema
>;

/** A FHIR reference to a Location (used for both `location[]` and `coverage_area[]`). */
export const HealthcareServiceLocationRefInputSchema = z.object({
  reference: z.string().min(1, "Reference is required"),
  reference_display: z.string().optional(),
});
export type THealthcareServiceLocationRefInput = z.infer<
  typeof HealthcareServiceLocationRefInputSchema
>;

/** A technical endpoint reference to attach to the service. */
export const HealthcareServiceEndpointInputSchema = z.object({
  reference: z.string().min(1, "Reference is required"),
  reference_display: z.string().optional(),
});
export type THealthcareServiceEndpointInput = z.infer<
  typeof HealthcareServiceEndpointInputSchema
>;

/** A contact point (phone, email, fax, etc.) for the service. */
export const HealthcareServiceTelecomInputSchema = z.object({
  system: z.string().optional(),
  value: z.string().optional(),
  use: z.string().optional(),
  rank: z.number().int().min(1).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
export type THealthcareServiceTelecomInput = z.infer<
  typeof HealthcareServiceTelecomInputSchema
>;

/** Eligibility criteria required to receive the service. No terminology binding — plain text. */
export const HealthcareServiceEligibilityInputSchema = z.object({
  code_system: z.string().optional(),
  code_code: z.string().optional(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  comment: z.string().optional(),
});
export type THealthcareServiceEligibilityInput = z.infer<
  typeof HealthcareServiceEligibilityInputSchema
>;

/** A time slot during which the service is available. */
export const HealthcareServiceAvailableTimeInputSchema = z.object({
  days_of_week: z.array(z.string()).optional(),
  all_day: z.boolean().optional(),
  available_start_time: z.string().optional(),
  available_end_time: z.string().optional(),
});
export type THealthcareServiceAvailableTimeInput = z.infer<
  typeof HealthcareServiceAvailableTimeInputSchema
>;

/** A period during which the service is not available. */
export const HealthcareServiceNotAvailableInputSchema = z.object({
  description: z.string().min(1, "Description is required"),
  during_start: z.string().optional(),
  during_end: z.string().optional(),
});
export type THealthcareServiceNotAvailableInput = z.infer<
  typeof HealthcareServiceNotAvailableInputSchema
>;

// ── Input validation schemas ───────────────────────────────────────────────────

/**
 * Full schema for creating a HealthcareService.
 * Mirrors fhir-gql's HealthcareServiceCreateSchema — every field is optional
 * except each sub-resource's own required fields (identifier.value,
 * location/coverage_area/endpoint.reference, not_available.description).
 */
export const CreateHealthcareServiceValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),

  /** FHIR reference to the providing Organization, e.g. "Organization/190001". */
  provided_by: z.string().optional(),
  provided_by_display: z.string().optional(),

  active: z.boolean().optional(),
  name: z.string().optional(),
  comment: z.string().optional(),
  extra_details: z.string().optional(),
  appointment_required: z.boolean().optional(),
  availability_exceptions: z.string().optional(),

  // Photo (FHIR Attachment, stored flat)
  photo_content_type: z.string().optional(),
  photo_language: z.string().optional(),
  photo_data: z.string().optional(),
  photo_url: z.string().optional(),
  photo_size: z.number().optional(),
  photo_hash: z.string().optional(),
  photo_title: z.string().optional(),
  photo_creation: z.string().optional(),

  identifier: z.array(HealthcareServiceIdentifierInputSchema).optional(),
  category: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  type: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  specialty: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  location: z.array(HealthcareServiceLocationRefInputSchema).optional(),
  telecom: z.array(HealthcareServiceTelecomInputSchema).optional(),
  coverage_area: z.array(HealthcareServiceLocationRefInputSchema).optional(),
  service_provision_code: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  eligibility: z.array(HealthcareServiceEligibilityInputSchema).optional(),
  program: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  characteristic: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  communication: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  referral_method: z.array(HealthcareServiceCodeableConceptInputSchema).optional(),
  available_time: z.array(HealthcareServiceAvailableTimeInputSchema).optional(),
  not_available: z.array(HealthcareServiceNotAvailableInputSchema).optional(),
  endpoint: z.array(HealthcareServiceEndpointInputSchema).optional(),
});
export type TCreateHealthcareService = z.infer<
  typeof CreateHealthcareServiceValidationSchema
>;

/**
 * Base patch fields (no id, no refinement) — used for the service dto and
 * as the foundation for the full validation schema. Only scalar fields are
 * patchable — array sub-resources require delete + re-create (confirmed via
 * fhir-gql's HealthcareServicePatchSchema, extra="forbid" — a harder limit
 * than Location's, matching Organization's).
 */
const PatchHealthcareServiceBaseSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().optional(),
  comment: z.string().optional(),
  extra_details: z.string().optional(),
  appointment_required: z.boolean().optional(),
  availability_exceptions: z.string().optional(),

  photo_content_type: z.string().optional(),
  photo_language: z.string().optional(),
  photo_data: z.string().optional(),
  photo_url: z.string().optional(),
  photo_size: z.number().optional(),
  photo_hash: z.string().optional(),
  photo_title: z.string().optional(),
  photo_creation: z.string().optional(),
});

/** Dto variant (no id) — used by the service interface update method. */
export const PatchHealthcareServiceDtoSchema = PatchHealthcareServiceBaseSchema;
export type TPatchHealthcareServiceDto = z.infer<typeof PatchHealthcareServiceDtoSchema>;

/**
 * Full patch validation schema — includes id and enforces that at least one
 * patchable field is present.
 */
export const PatchHealthcareServiceValidationSchema = PatchHealthcareServiceBaseSchema.extend({
  id: z.number(),
}).refine(
  (fields) => Object.entries(fields).some(([key, value]) => key !== "id" && value !== undefined),
  { message: "At least one field must be provided for update" },
);
export type TPatchHealthcareService = z.infer<typeof PatchHealthcareServiceValidationSchema>;

/**
 * Query parameters for listing healthcare services (server-side filtering + pagination).
 * Unlike Location, there IS a real `name` filter (matches Organization's list contract).
 */
export const ListHealthcareServicesValidationSchema = z.object({
  name: z.string().optional(),
  active: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListHealthcareServicesQuery = z.infer<
  typeof ListHealthcareServicesValidationSchema
>;

export const GetHealthcareServiceByIdValidationSchema = z.object({ id: z.number() });
export type TGetHealthcareServiceById = z.infer<
  typeof GetHealthcareServiceByIdValidationSchema
>;

export const DeleteHealthcareServiceValidationSchema = z.object({ id: z.number() });
export type TDeleteHealthcareService = z.infer<
  typeof DeleteHealthcareServiceValidationSchema
>;
