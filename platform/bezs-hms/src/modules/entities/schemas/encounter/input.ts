/**
 * Encounter input/validation schemas.
 *
 * Layer: entities / schemas / encounter
 *
 * Contains write-side Zod schemas:
 *   - CreateEncounterValidationSchema — full FHIR create with all child arrays
 *   - UpdateEncounterDtoSchema        — scalar-only PATCH fields
 *   - UpdateEncounterValidationSchema — patch + id
 *   - ListEncountersValidationSchema  — paginated list with filters
 *   - GetByIdEncounterValidationSchema
 *   - DeleteEncounterValidationSchema
 *
 * Key constraints:
 *   - status (1..1) is required on create
 *   - Child arrays (participant, diagnosis, location, etc.) are immutable
 *     after creation — delete + re-create to change them
 *   - JSON key for care-setting class array is "class" (Python reserved word)
 *   - References use public integer IDs: "Patient/10001", "Practitioner/30001"
 */

import { z } from "zod";

// ── Shared reusable sub-schemas ───────────────────────────────────────────────

const CodeableConceptInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

// ── Child array input schemas ─────────────────────────────────────────────────

const EncounterIdentifierInputSchema = z.object({
  use: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  value: z.string(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  assigner: z.string().optional(),
});

const EncounterStatusHistoryInputSchema = z.object({
  status: z.string(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

const EncounterClassHistoryInputSchema = z.object({
  class_system: z.string().optional(),
  class_version: z.string().optional(),
  class_code: z.string(),
  class_display: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

const EncounterBusinessStatusInputSchema = z.object({
  code_system: z.string().optional(),
  code_code: z.string(),
  code_display: z.string().optional(),
  code_text: z.string().optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  effective_date: z.string().optional(),
});

const EncounterServiceTypeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
  /** FHIR reference string, e.g. "HealthcareService/501". */
  reference: z.string().optional(),
  reference_display: z.string().optional(),
});

const EncounterEpisodeOfCareInputSchema = z.object({
  /** FHIR reference string, e.g. "EpisodeOfCare/501". */
  reference: z.string(),
  reference_display: z.string().optional(),
});

const EncounterBasedOnInputSchema = z.object({
  /** FHIR reference string, e.g. "ServiceRequest/80001" or "CarePlan/500". */
  reference: z.string(),
  reference_display: z.string().optional(),
});

const EncounterCareTeamInputSchema = z.object({
  /** FHIR reference string, e.g. "CareTeam/501". */
  reference: z.string(),
  reference_display: z.string().optional(),
});

const EncounterParticipantInputSchema = z.object({
  type: z.array(CodeableConceptInputSchema).optional(),
  /** Actor reference, e.g. "Practitioner/30001" or "Patient/10001". */
  reference: z.string().optional(),
  reference_display: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

const EncounterAppointmentRefInputSchema = z.object({
  /** FHIR reference string, e.g. "Appointment/40001". */
  reference: z.string(),
  reference_display: z.string().optional(),
});

const EncounterVirtualServiceInputSchema = z.object({
  channel_type_system: z.string().optional(),
  channel_type_code: z.string().optional(),
  channel_type_display: z.string().optional(),
  address_url: z.string().optional(),
  additional_info: z.string().optional(),
  max_participants: z.number().int().optional(),
  session_key: z.string().optional(),
});

const EncounterReasonInputSchema = z.object({
  use: z
    .array(
      z.object({
        coding_system: z.string().optional(),
        coding_code: z.string().optional(),
        coding_display: z.string().optional(),
        text: z.string().optional(),
      }),
    )
    .optional(),
  value: z
    .array(
      z.object({
        coding_system: z.string().optional(),
        coding_code: z.string().optional(),
        coding_display: z.string().optional(),
        text: z.string().optional(),
        /** e.g. "Condition/120001" or "Observation/99001". */
        reference: z.string().optional(),
        reference_display: z.string().optional(),
      }),
    )
    .optional(),
});

const EncounterDiagnosisInputSchema = z.object({
  condition: z
    .array(
      z.object({
        coding_system: z.string().optional(),
        coding_code: z.string().optional(),
        coding_display: z.string().optional(),
        text: z.string().optional(),
        /** e.g. "Condition/120001". */
        reference: z.string().optional(),
        reference_display: z.string().optional(),
      }),
    )
    .optional(),
  use: z.array(CodeableConceptInputSchema).optional(),
});

const EncounterAccountInputSchema = z.object({
  /** FHIR reference string, e.g. "Account/501". */
  reference: z.string(),
  reference_display: z.string().optional(),
});

const EncounterAdmissionInputSchema = z.object({
  pre_admission_identifier_system: z.string().optional(),
  pre_admission_identifier_value: z.string().optional(),
  /** Origin Location or Organization reference, e.g. "Location/123". */
  origin: z.string().optional(),
  origin_display: z.string().optional(),
  admit_source_system: z.string().optional(),
  admit_source_code: z.string().optional(),
  admit_source_display: z.string().optional(),
  admit_source_text: z.string().optional(),
  re_admission_system: z.string().optional(),
  re_admission_code: z.string().optional(),
  re_admission_display: z.string().optional(),
  re_admission_text: z.string().optional(),
  /** Destination Location or Organization reference, e.g. "Location/456". */
  destination: z.string().optional(),
  destination_display: z.string().optional(),
  discharge_disposition_system: z.string().optional(),
  discharge_disposition_code: z.string().optional(),
  discharge_disposition_display: z.string().optional(),
  discharge_disposition_text: z.string().optional(),
});

const EncounterLocationInputSchema = z.object({
  /** FHIR reference to the Location, e.g. "Location/501". */
  reference: z.string(),
  reference_display: z.string().optional(),
  /** planned | active | reserved | completed */
  status: z.string().optional(),
  form_system: z.string().optional(),
  form_code: z.string().optional(),
  form_display: z.string().optional(),
  form_text: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

// ── Main schemas ──────────────────────────────────────────────────────────────

/**
 * Full create payload for POST /encounters/.
 * status (1..1) is the only required field.
 * "class" is the JSON key for the care-setting class array (Python reserved word).
 */
export const CreateEncounterValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),

  /**
   * R5 status: planned | in-progress | on-hold | discharged | completed |
   * cancelled | discontinued | entered-in-error | unknown
   */
  status: z.string(),

  // priority (0..1 CodeableConcept)
  priority_system: z.string().optional(),
  priority_code: z.string().optional(),
  priority_display: z.string().optional(),
  priority_text: z.string().optional(),

  /** Subject reference, e.g. "Patient/10001". */
  subject: z.string().optional(),

  // subjectStatus (R5)
  subject_status_system: z.string().optional(),
  subject_status_code: z.string().optional(),
  subject_status_display: z.string().optional(),
  subject_status_text: z.string().optional(),

  // Timing
  actual_period_start: z.string().optional(),
  actual_period_end: z.string().optional(),
  planned_start_date: z.string().optional(),
  planned_end_date: z.string().optional(),

  // Length Duration (flat fields)
  length_value: z.number().optional(),
  length_comparator: z.string().optional(),
  length_unit: z.string().optional(),
  length_system: z.string().optional(),
  length_code: z.string().optional(),

  /** serviceProvider reference, e.g. "Organization/100". */
  service_provider: z.string().optional(),
  service_provider_display: z.string().optional(),

  /** Integer ID of parent Encounter (partOf). */
  part_of_id: z.number().int().optional(),

  // Child arrays
  identifier: z.array(EncounterIdentifierInputSchema).optional(),
  status_history: z.array(EncounterStatusHistoryInputSchema).optional(),
  class_history: z.array(EncounterClassHistoryInputSchema).optional(),
  // JSON key is "class" — valid as object literal property despite being reserved
  class: z.array(CodeableConceptInputSchema).optional(),
  business_status: z.array(EncounterBusinessStatusInputSchema).optional(),
  service_type: z.array(EncounterServiceTypeInputSchema).optional(),
  type: z.array(CodeableConceptInputSchema).optional(),
  episode_of_care: z.array(EncounterEpisodeOfCareInputSchema).optional(),
  based_on: z.array(EncounterBasedOnInputSchema).optional(),
  care_team: z.array(EncounterCareTeamInputSchema).optional(),
  participant: z.array(EncounterParticipantInputSchema).optional(),
  appointment: z.array(EncounterAppointmentRefInputSchema).optional(),
  virtual_service: z.array(EncounterVirtualServiceInputSchema).optional(),
  reason: z.array(EncounterReasonInputSchema).optional(),
  diagnosis: z.array(EncounterDiagnosisInputSchema).optional(),
  account: z.array(EncounterAccountInputSchema).optional(),
  admission: EncounterAdmissionInputSchema.optional(),
  diet_preference: z.array(CodeableConceptInputSchema).optional(),
  special_arrangement: z.array(CodeableConceptInputSchema).optional(),
  special_courtesy: z.array(CodeableConceptInputSchema).optional(),
  location: z.array(EncounterLocationInputSchema).optional(),
});
export type TCreateEncounter = z.infer<typeof CreateEncounterValidationSchema>;

/**
 * Scalar-only PATCH payload for PATCH /encounters/{id}.
 * Structural arrays cannot be updated in-place after creation.
 * At least one field must be provided (enforced in the fhir-gql service layer).
 */
const UpdateEncounterBaseSchema = z.object({
  status: z.string().optional(),
  /** Close the encounter by setting the actual period end time. */
  actual_period_end: z.string().optional(),
  priority_system: z.string().optional(),
  priority_code: z.string().optional(),
  priority_display: z.string().optional(),
  priority_text: z.string().optional(),
  subject_status_system: z.string().optional(),
  subject_status_code: z.string().optional(),
  subject_status_display: z.string().optional(),
  subject_status_text: z.string().optional(),
  planned_end_date: z.string().optional(),
});

/** DTO passed directly to the service's update() method (no id field). */
export const UpdateEncounterDtoSchema = UpdateEncounterBaseSchema;
export type TUpdateEncounterDto = z.infer<typeof UpdateEncounterDtoSchema>;

/** Full update payload used by the controller (id + scalar patch fields). */
export const UpdateEncounterValidationSchema = UpdateEncounterBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateEncounter = z.infer<typeof UpdateEncounterValidationSchema>;

/**
 * Query parameters for GET /encounters/.
 * All filters are optional — omitting them returns encounters the caller can see.
 */
export const ListEncountersValidationSchema = z.object({
  /** Filter by encounter status (planned | in-progress | completed | etc.). */
  status: z.string().optional(),
  /** Filter encounters for this FHIR patient (integer patient_id). */
  patient_id: z.number().int().optional(),
  /** Filter encounters linked to this appointment via Encounter.appointment[]. */
  appointment_id: z.number().int().optional(),
  /** actualPeriod.start >= this value (ISO 8601). */
  actual_period_start_from: z.string().optional(),
  /** actualPeriod.start <= this value (ISO 8601). */
  actual_period_start_to: z.string().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListEncountersQuery = z.infer<typeof ListEncountersValidationSchema>;

/** Payload for GET /encounters/{id}. */
export const GetByIdEncounterValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TGetByIdEncounter = z.infer<typeof GetByIdEncounterValidationSchema>;

/** Payload for DELETE /encounters/{id}. */
export const DeleteEncounterValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TDeleteEncounter = z.infer<typeof DeleteEncounterValidationSchema>;
