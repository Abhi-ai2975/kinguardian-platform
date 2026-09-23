/**
 * Schedule form schemas for React Hook Form.
 *
 * Layer: entities / schemas / schedule
 *
 * Form schemas intentionally differ from the validation schema:
 *  - `actor[]` is split into three typed groups (practitioner_roles,
 *    locations, healthcare_services) matching the Actors tab's three
 *    RepeatableGroups (and the A2UI reference form's own grouping) — the
 *    modal concatenates them into one `actor[]` array before submit.
 *  - EditScheduleFormSchema only exposes the scalar fields patchable per the
 *    fhir-gql PATCH contract (see PatchScheduleDtoSchema in input.ts) — array
 *    sub-resources are not editable here.
 */

import { z } from "zod";
import {
  ScheduleIdentifierInputSchema,
  ScheduleCodeableConceptInputSchema,
  ScheduleActorInputSchema,
} from "./input";

/**
 * Full form schema for the "Create Schedule" modal.
 * Covers all fields accepted by fhir-gql's ScheduleCreateSchema except
 * user_id/org_id, which the modal stamps from the session.
 */
export const CreateScheduleFormSchema = z.object({
  active: z.boolean().optional(),
  comment: z.string().optional(),

  planning_horizon_start: z.string().optional(),
  planning_horizon_end: z.string().optional(),

  identifier: z.array(ScheduleIdentifierInputSchema).optional(),
  service_category: z.array(ScheduleCodeableConceptInputSchema).optional(),
  service_type: z.array(ScheduleCodeableConceptInputSchema).optional(),
  specialty: z.array(ScheduleCodeableConceptInputSchema).optional(),

  /** Actor sub-groups — concatenated into `actor[]` by the modal before submit. */
  practitioner_roles: z.array(ScheduleActorInputSchema).optional(),
  locations: z.array(ScheduleActorInputSchema).optional(),
  healthcare_services: z.array(ScheduleActorInputSchema).optional(),
});
export type TCreateScheduleFormSchema = z.infer<typeof CreateScheduleFormSchema>;

/**
 * Form schema for the "Edit Schedule" modal.
 * Only exposes scalar fields patchable per the fhir-gql PATCH contract.
 * Child arrays are not editable here — delete and re-create to change those.
 */
export const EditScheduleFormSchema = z.object({
  active: z.boolean().optional(),
  comment: z.string().optional(),
  planning_horizon_start: z.string().optional(),
  planning_horizon_end: z.string().optional(),
});
export type TEditScheduleFormSchema = z.infer<typeof EditScheduleFormSchema>;
