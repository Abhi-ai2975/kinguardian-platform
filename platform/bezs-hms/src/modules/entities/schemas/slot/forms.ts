/**
 * Slot form schemas for React Hook Form.
 *
 * Layer: entities / schemas / slot
 *
 * Three distinct forms, matching the two real fhir-gql write paths plus edit:
 *  - CreateSlotFormSchema   — manual one-off slot (POST /slots/).
 *  - GenerateSlotsFormSchema — bulk auto-generation (POST /slots/generate).
 *  - EditSlotFormSchema     — PATCH scalar fields only (see SlotPatchDtoSchema).
 */

import { z } from "zod";
import {
  SlotStatusSchema,
  SlotIdentifierInputSchema,
  SlotServiceCategoryInputSchema,
  SlotServiceTypeInputSchema,
  SlotSpecialtyInputSchema,
} from "./input";

/**
 * Form schema for the "New Slot" manual create Sheet.
 * `schedule` is a plain FHIR reference string (e.g. "Schedule/200001"),
 * matching the free-text reference-picker pattern used for every other
 * reference field in this admin section.
 */
export const CreateSlotFormSchema = z.object({
  schedule: z.string().min(1, "Schedule reference is required"),
  schedule_display: z.string().optional(),
  status: SlotStatusSchema,
  start: z.string().optional(),
  end: z.string().optional(),
  overbooked: z.boolean().optional(),
  comment: z.string().optional(),
  appointment_type_system: z.string().optional(),
  appointment_type_code: z.string().optional(),
  appointment_type_display: z.string().optional(),
  appointment_type_text: z.string().optional(),
  identifier: z.array(SlotIdentifierInputSchema).optional(),
  service_category: z.array(SlotServiceCategoryInputSchema).optional(),
  service_type: z.array(SlotServiceTypeInputSchema).optional(),
  specialty: z.array(SlotSpecialtyInputSchema).optional(),
});
export type TCreateSlotFormSchema = z.infer<typeof CreateSlotFormSchema>;

/**
 * Form schema for the "Edit Slot" Sheet.
 * Only exposes scalar fields patchable per the fhir-gql PATCH contract.
 * Child arrays and the schedule reference are not editable here.
 */
export const EditSlotFormSchema = z.object({
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
export type TEditSlotFormSchema = z.infer<typeof EditSlotFormSchema>;

/**
 * Form schema for the "Generate Slots" bulk-generation Sheet.
 * `schedule_id` is the fhir-gql numeric primary key (NOT a FHIR reference
 * string) — the real SlotGenerateSchema takes a plain int, unlike every
 * other reference field in this admin section.
 */
export const GenerateSlotsFormSchema = z
  .object({
    schedule_id: z.number({ message: "Schedule ID is required" }),
    /** Not sent to the API — mirrors the picker's label so it survives form.reset()/re-render. */
    schedule_display: z.string().optional(),
    generation_start: z.string().min(1, "Generation start is required"),
    generation_end: z.string().min(1, "Generation end is required"),
    slot_duration_minutes: z.number().min(1).max(1440),
    appointment_type_system: z.string().optional(),
    appointment_type_code: z.string().optional(),
    appointment_type_display: z.string().optional(),
    appointment_type_text: z.string().optional(),
    service_category: z.array(SlotServiceCategoryInputSchema).optional(),
    service_type: z.array(SlotServiceTypeInputSchema).optional(),
    specialty: z.array(SlotSpecialtyInputSchema).optional(),
    overbooked: z.boolean().optional(),
    comment: z.string().optional(),
  })
  .refine(
    (fields) => new Date(fields.generation_end) > new Date(fields.generation_start),
    {
      message: "Generation end must be after generation start",
      path: ["generation_end"],
    },
  );
export type TGenerateSlotsFormSchema = z.infer<typeof GenerateSlotsFormSchema>;
