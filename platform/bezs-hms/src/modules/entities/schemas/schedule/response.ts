/**
 * Schedule response schemas.
 *
 * Layer: entities / schemas / schedule
 *
 * Mirrors fhir-gql's app/schemas/schedule/response.py. All optional fields
 * use .nullish() — the fhir-gql API serialises Python's Optional[X] = None
 * as explicit JSON null, not as a missing key.
 *
 * fhir-gql types every array sub-resource as a typed Pydantic sub-model
 * (each with its own `id`), matching Organization/HealthcareService (not
 * Location, whose response forwards arrays untyped).
 */

import { z } from "zod";

/** Single FHIR Identifier attached to a Schedule. */
export const ScheduleIdentifierResponseSchema = z.object({
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
export type TScheduleIdentifierResponse = z.infer<
  typeof ScheduleIdentifierResponseSchema
>;

/** Shared shape for Schedule's 3 simple CodeableConcept sub-resource rows. */
export const ScheduleCodeableConceptResponseSchema = z.object({
  id: z.number().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TScheduleCodeableConceptResponse = z.infer<
  typeof ScheduleCodeableConceptResponseSchema
>;

/**
 * A single actor reference row. The fhir-server splits the FHIR reference
 * string (e.g. "Practitioner/30001") into reference_type + reference_id.
 */
export const ScheduleActorResponseSchema = z.object({
  id: z.number().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TScheduleActorResponse = z.infer<typeof ScheduleActorResponseSchema>;

/** Full FHIR Schedule resource returned by the fhir-gql API. */
export const ScheduleResponseSchema = z.object({
  id: z.number(),
  active: z.boolean().nullish(),
  comment: z.string().nullish(),
  planning_horizon_start: z.string().nullish(),
  planning_horizon_end: z.string().nullish(),

  identifier: z.array(ScheduleIdentifierResponseSchema).nullish(),
  service_category: z.array(ScheduleCodeableConceptResponseSchema).nullish(),
  service_type: z.array(ScheduleCodeableConceptResponseSchema).nullish(),
  specialty: z.array(ScheduleCodeableConceptResponseSchema).nullish(),
  actor: z.array(ScheduleActorResponseSchema).nullish(),

  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TScheduleResponse = z.infer<typeof ScheduleResponseSchema>;

/**
 * Paginated list response — { total, limit, offset, data: TScheduleResponse[] }.
 */
export const PaginatedScheduleResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(ScheduleResponseSchema),
});
export type TPaginatedScheduleResponse = z.infer<
  typeof PaginatedScheduleResponseSchema
>;
