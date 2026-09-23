/**
 * Slot response schemas.
 *
 * Layer: entities / schemas / slot
 *
 * Mirrors the fhir-gql plain JSON response shapes (Accept: application/json).
 * All optional fields use .nullish() — the API returns explicit JSON null for
 * absent fields, not missing keys.
 *
 * Child arrays (identifier, service_category, service_type, specialty) are
 * always embedded in the top-level Slot response — there are no separate
 * sub-resource endpoints.
 *
 * Reference: https://hl7.org/fhir/R4/slot.html
 */

import { z } from "zod";

// ── Child array sub-schemas ───────────────────────────────────────────────────

/** A business identifier on a Slot (e.g. booking reference number). */
export const SlotIdentifierResponseSchema = z.object({
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
export type TSlotIdentifierResponse = z.infer<typeof SlotIdentifierResponseSchema>;

/** A broad service category (CodeableConcept) on a Slot. */
export const SlotServiceCategoryResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TSlotServiceCategoryResponse = z.infer<typeof SlotServiceCategoryResponseSchema>;

/** A specific service type (CodeableConcept) on a Slot. */
export const SlotServiceTypeResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TSlotServiceTypeResponse = z.infer<typeof SlotServiceTypeResponseSchema>;

/** A clinical specialty (CodeableConcept, SNOMED CT) on a Slot. */
export const SlotSpecialtyResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TSlotSpecialtyResponse = z.infer<typeof SlotSpecialtyResponseSchema>;

// ── Top-level response ────────────────────────────────────────────────────────

/**
 * Full Slot plain-JSON response from fhir-gql.
 * All 4 child arrays are embedded inline — there are no sub-resource routes.
 */
export const SlotResponseSchema = z.object({
  id: z.number(),
  /** busy | free | busy-unavailable | busy-tentative | entered-in-error */
  status: z.string().nullish(),
  start: z.string().nullish(),
  end: z.string().nullish(),
  overbooked: z.boolean().nullish(),
  comment: z.string().nullish(),
  // Schedule reference (split by fhir-server)
  schedule_type: z.string().nullish(),
  schedule_id: z.number().nullish(),
  schedule_display: z.string().nullish(),
  // Appointment type (flat CodeableConcept)
  appointment_type_system: z.string().nullish(),
  appointment_type_code: z.string().nullish(),
  appointment_type_display: z.string().nullish(),
  appointment_type_text: z.string().nullish(),
  // Child arrays
  identifier: z.array(SlotIdentifierResponseSchema).nullish(),
  service_category: z.array(SlotServiceCategoryResponseSchema).nullish(),
  service_type: z.array(SlotServiceTypeResponseSchema).nullish(),
  specialty: z.array(SlotSpecialtyResponseSchema).nullish(),
  // Tenant scoping
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  // Audit fields
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TSlotResponse = z.infer<typeof SlotResponseSchema>;

/** Paginated wrapper returned by GET /slots/. */
export const PaginatedSlotResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(SlotResponseSchema),
});
export type TPaginatedSlotResponse = z.infer<typeof PaginatedSlotResponseSchema>;

/**
 * Response from POST /slots/generate.
 * fhir-gql generates every slot in a single atomic transaction — either all
 * slots in the window are created, or none are and the request fails with a
 * normal error response. There is no partial-success/failed_count shape.
 */
export const SlotGenerateResponseSchema = z.object({
  schedule_id: z.number(),
  generated_count: z.number(),
  slot_ids: z.array(z.number()),
  generation_start: z.string(),
  generation_end: z.string(),
  slot_duration_minutes: z.number(),
});
export type TSlotGenerateResponse = z.infer<typeof SlotGenerateResponseSchema>;
