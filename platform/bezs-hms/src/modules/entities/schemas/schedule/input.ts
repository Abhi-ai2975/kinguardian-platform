/**
 * Schedule input validation schemas and DTO types.
 *
 * Layer: entities / schemas / schedule
 *
 * Mirrors fhir-gql's input Pydantic models exactly (app/schemas/schedule/input.py).
 * Covers: input sub-schemas, create / patch / list / getById / delete validation schemas.
 *
 * All coded/enum-shaped fields are plain `z.string()` — never `z.enum([...])`.
 * fhir-gql types these as `Optional[str]`, not backend-enforced enums, and
 * the coded ones are sourced from the live FHIR terminology server via
 * TerminologySelect. Applied from the start here, same as HealthcareService.
 */

import { z } from "zod";

// ── Input sub-schemas ──────────────────────────────────────────────────────────

/** Single FHIR Identifier to attach to a Schedule on create. */
export const ScheduleIdentifierInputSchema = z.object({
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
export type TScheduleIdentifierInput = z.infer<typeof ScheduleIdentifierInputSchema>;

/**
 * Shared shape for Schedule's 3 simple CodeableConcept sub-resources
 * (service_category, service_type, specialty) — all
 * `{coding_system?, coding_code?, coding_display?, text?}`.
 */
export const ScheduleCodeableConceptInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TScheduleCodeableConceptInput = z.infer<
  typeof ScheduleCodeableConceptInputSchema
>;

/**
 * A resource this Schedule provides availability for.
 * FHIR allows Patient/Practitioner/PractitionerRole/RelatedPerson/Device/
 * HealthcareService/Location — the admin UI only surfaces PractitionerRole,
 * Location, and HealthcareService (matching the A2UI reference form), but
 * the schema itself accepts any valid FHIR reference string.
 */
export const ScheduleActorInputSchema = z.object({
  reference: z.string().min(1, "Reference is required"),
  reference_display: z.string().optional(),
});
export type TScheduleActorInput = z.infer<typeof ScheduleActorInputSchema>;

// ── Input validation schemas ───────────────────────────────────────────────────

/**
 * Full schema for creating a Schedule.
 * Mirrors fhir-gql's ScheduleCreateSchema — every field is optional except
 * each sub-resource's own required fields (identifier.value, actor.reference).
 */
export const CreateScheduleValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),

  active: z.boolean().optional(),
  comment: z.string().optional(),

  planning_horizon_start: z.string().optional(),
  planning_horizon_end: z.string().optional(),

  identifier: z.array(ScheduleIdentifierInputSchema).optional(),
  service_category: z.array(ScheduleCodeableConceptInputSchema).optional(),
  service_type: z.array(ScheduleCodeableConceptInputSchema).optional(),
  specialty: z.array(ScheduleCodeableConceptInputSchema).optional(),
  actor: z.array(ScheduleActorInputSchema).optional(),
});
export type TCreateSchedule = z.infer<typeof CreateScheduleValidationSchema>;

/**
 * Base patch fields (no id, no refinement) — used for the service dto and
 * as the foundation for the full validation schema. Only scalar fields are
 * patchable — array sub-resources require delete + re-create (confirmed via
 * fhir-gql's SchedulePatchSchema, extra="forbid" — no array fields at all).
 */
const PatchScheduleBaseSchema = z.object({
  active: z.boolean().optional(),
  comment: z.string().optional(),
  planning_horizon_start: z.string().optional(),
  planning_horizon_end: z.string().optional(),
});

/** Dto variant (no id) — used by the service interface update method. */
export const PatchScheduleDtoSchema = PatchScheduleBaseSchema;
export type TPatchScheduleDto = z.infer<typeof PatchScheduleDtoSchema>;

/**
 * Full patch validation schema — includes id and enforces that at least one
 * patchable field is present.
 */
export const PatchScheduleValidationSchema = PatchScheduleBaseSchema.extend({
  id: z.number(),
}).refine(
  (fields) => Object.entries(fields).some(([key, value]) => key !== "id" && value !== undefined),
  { message: "At least one field must be provided for update" },
);
export type TPatchSchedule = z.infer<typeof PatchScheduleValidationSchema>;

/**
 * Query parameters for listing schedules (server-side filtering + pagination).
 * Unlike Slot, there is NO org_id/user_id filter — fhir-gql's
 * ListSchedulesSchema only accepts active, limit, offset. Schedule also has
 * no `name` field at all — `comment` is the closest thing to a display label.
 */
export const ListSchedulesValidationSchema = z.object({
  active: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListSchedulesQuery = z.infer<typeof ListSchedulesValidationSchema>;

export const GetScheduleByIdValidationSchema = z.object({ id: z.number() });
export type TGetScheduleById = z.infer<typeof GetScheduleByIdValidationSchema>;

export const DeleteScheduleValidationSchema = z.object({ id: z.number() });
export type TDeleteSchedule = z.infer<typeof DeleteScheduleValidationSchema>;
