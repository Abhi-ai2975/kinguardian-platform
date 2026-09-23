/**
 * Slot input/validation schemas.
 *
 * Layer: entities / schemas / slot
 *
 * Contains write-side Zod schemas: create DTO (with 4 inline child arrays),
 * patch DTO (scalar fields only), and query schemas for the list endpoint.
 *
 * Required on create: schedule (FHIR ref string) and status.
 * Child arrays (identifier, service_category, service_type, specialty) are
 * NOT patchable — delete and recreate the slot to change them.
 *
 * Mirrors the fhir-gql Pydantic input models.
 */

import { z } from "zod";

// ── Child array input schemas ─────────────────────────────────────────────────

/** Input for a business identifier on a Slot. */
export const SlotIdentifierInputSchema = z.object({
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
export type TSlotIdentifierInput = z.infer<typeof SlotIdentifierInputSchema>;

/** Input for a broad service category (CodeableConcept) on a Slot. */
export const SlotServiceCategoryInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TSlotServiceCategoryInput = z.infer<typeof SlotServiceCategoryInputSchema>;

/** Input for a specific service type (CodeableConcept) on a Slot. */
export const SlotServiceTypeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TSlotServiceTypeInput = z.infer<typeof SlotServiceTypeInputSchema>;

/** Input for a clinical specialty (SNOMED CT CodeableConcept) on a Slot. */
export const SlotSpecialtyInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TSlotSpecialtyInput = z.infer<typeof SlotSpecialtyInputSchema>;

// ── Core CRUD ─────────────────────────────────────────────────────────────────

/** Valid Slot status codes per FHIR R4. */
export const SlotStatusSchema = z.enum([
  "busy",
  "free",
  "busy-unavailable",
  "busy-tentative",
  "entered-in-error",
]);
export type TSlotStatus = z.infer<typeof SlotStatusSchema>;

/**
 * Schema for creating a new Slot.
 * schedule and status are required; all other fields and child arrays are optional.
 * Child arrays are accepted inline and created atomically with the parent slot.
 */
export const CreateSlotValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  /** FHIR reference string, e.g. "Schedule/200001". Required. */
  schedule: z.string().min(1),
  schedule_display: z.string().optional(),
  /** Slot availability status. Required. */
  status: SlotStatusSchema,
  start: z.string().optional(),
  end: z.string().optional(),
  overbooked: z.boolean().optional(),
  comment: z.string().optional(),
  // Appointment type (flat CodeableConcept)
  appointment_type_system: z.string().optional(),
  appointment_type_code: z.string().optional(),
  appointment_type_display: z.string().optional(),
  appointment_type_text: z.string().optional(),
  // Child arrays (all optional — omit to skip)
  identifier: z.array(SlotIdentifierInputSchema).optional(),
  service_category: z.array(SlotServiceCategoryInputSchema).optional(),
  service_type: z.array(SlotServiceTypeInputSchema).optional(),
  specialty: z.array(SlotSpecialtyInputSchema).optional(),
});
export type TCreateSlot = z.infer<typeof CreateSlotValidationSchema>;

/**
 * Patch-only scalar fields.
 * Child arrays and schedule reference cannot be patched — recreate the slot instead.
 */
const SlotPatchBaseSchema = z.object({
  status: SlotStatusSchema.optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  overbooked: z.boolean().optional(),
  comment: z.string().optional(),
  appointment_type_system: z.string().optional(),
  appointment_type_code: z.string().optional(),
  appointment_type_display: z.string().optional(),
  appointment_type_text: z.string().optional(),
});

/** DTO type (API body) for PATCH /slots/{id}. Does not include id. */
export const SlotPatchDtoSchema = SlotPatchBaseSchema;
export type TSlotPatchDto = z.infer<typeof SlotPatchDtoSchema>;

/** Full validation schema for an update action (includes id for controller routing). */
export const UpdateSlotValidationSchema = SlotPatchBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateSlot = z.infer<typeof UpdateSlotValidationSchema>;

/** Query params for GET /slots/. */
export const ListSlotsValidationSchema = z.object({
  status: SlotStatusSchema.optional(),
  /** Filter by linked Schedule integer ID. */
  schedule_id: z.number().int().optional(),
  /** Filter by linked PractitionerRole integer ID (slots on that practitioner's schedules). */
  practitioner_role_id: z.number().int().optional(),
  /** Exact date filter (YYYY-MM-DD) — returns slots whose start falls on this date. */
  date: z.string().optional(),
  /** Returns slots with start >= this value (ISO datetime or YYYY-MM-DD). */
  start_from: z.string().optional(),
  /** Returns slots with start <= this value (ISO datetime or YYYY-MM-DD). */
  start_to: z.string().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListSlotsQuery = z.infer<typeof ListSlotsValidationSchema>;

/** Schema for fetching a single Slot by ID. */
export const GetByIdSlotValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TGetByIdSlot = z.infer<typeof GetByIdSlotValidationSchema>;

/** Schema for deleting a Slot by ID. */
export const DeleteSlotValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TDeleteSlot = z.infer<typeof DeleteSlotValidationSchema>;

// ── Bulk generation (POST /slots/generate) ────────────────────────────────────

/**
 * Schema for auto-generating Slots for a Schedule within a time window.
 * Mirrors fhir-gql's SlotGenerateSchema exactly (extra="forbid").
 *
 * schedule_id, generation_start, generation_end, slot_duration_minutes are
 * required. service_category/service_type/specialty are optional overrides —
 * when omitted, fhir-gql auto-inherits them from the Schedule, then from the
 * PractitionerRole actor's specialty[] as a further fallback for specialty.
 */
export const GenerateSlotsValidationSchema = z
  .object({
    user_id: z.string().optional(),
    org_id: z.string().optional(),

    schedule_id: z.number().int(),

    /** Start of the generation window (inclusive). Must fall within the Schedule's planning horizon. */
    generation_start: z.string().min(1, "Generation start is required"),
    /** End of the generation window (exclusive). Must fall within the Schedule's planning horizon. */
    generation_end: z.string().min(1, "Generation end is required"),

    /** Duration of each generated slot in minutes (1–1440). Must divide evenly into the window. */
    slot_duration_minutes: z.number().int().min(1).max(1440),

    // Appointment type (flat CodeableConcept) — optional, can be set at booking time instead.
    appointment_type_system: z.string().optional(),
    appointment_type_code: z.string().optional(),
    appointment_type_display: z.string().optional(),
    appointment_type_text: z.string().optional(),

    // Override arrays — auto-inherited from Schedule / PractitionerRole actor if omitted.
    service_category: z.array(SlotServiceCategoryInputSchema).optional(),
    service_type: z.array(SlotServiceTypeInputSchema).optional(),
    specialty: z.array(SlotSpecialtyInputSchema).optional(),

    overbooked: z.boolean().optional(),
    comment: z.string().optional(),
  })
  .refine(
    (fields) => new Date(fields.generation_end) > new Date(fields.generation_start),
    {
      message: "generation_end must be after generation_start",
      path: ["generation_end"],
    },
  );
export type TGenerateSlots = z.infer<typeof GenerateSlotsValidationSchema>;
