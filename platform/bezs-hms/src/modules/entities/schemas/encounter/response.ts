/**
 * Encounter response schemas.
 *
 * Layer: entities / schemas / encounter
 *
 * Mirrors the fhir-gql plain JSON response shapes (Accept: application/json).
 * All optional fields use .nullish() — the API returns explicit JSON null for
 * absent fields, not missing keys.
 *
 * All child arrays are embedded inline in the top-level response — there are
 * no separate sub-resource routes for Encounter.
 *
 * Special note: the JSON key for the care-setting class array is literally
 * "class" (Python alias from reserved keyword class_).
 *
 * Reference: https://hl7.org/fhir/R5/encounter.html
 */

import { z } from "zod";

// ── Child sub-schemas ─────────────────────────────────────────────────────────

/** Business identifier on an Encounter. */
export const EncounterIdentifierResponseSchema = z.object({
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
export type TEncounterIdentifierResponse = z.infer<typeof EncounterIdentifierResponseSchema>;

/** Past status entry in the Encounter lifecycle. */
export const EncounterStatusHistoryResponseSchema = z.object({
  status: z.string(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TEncounterStatusHistoryResponse = z.infer<typeof EncounterStatusHistoryResponseSchema>;

/** R4 classHistory entry — kept for backward compat. */
export const EncounterClassHistoryResponseSchema = z.object({
  class_system: z.string().nullish(),
  class_version: z.string().nullish(),
  class_code: z.string().nullish(),
  class_display: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TEncounterClassHistoryResponse = z.infer<typeof EncounterClassHistoryResponseSchema>;

/** class[] (0..*) CodeableConcept — R5 changed from 0..1 Coding. */
export const EncounterClassResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TEncounterClassResponse = z.infer<typeof EncounterClassResponseSchema>;

/** businessStatus[] — R5 workflow status tracking. */
export const EncounterBusinessStatusResponseSchema = z.object({
  code_system: z.string().nullish(),
  code_code: z.string().nullish(),
  code_display: z.string().nullish(),
  code_text: z.string().nullish(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  effective_date: z.string().nullish(),
});
export type TEncounterBusinessStatusResponse = z.infer<typeof EncounterBusinessStatusResponseSchema>;

/** serviceType[] CodeableReference(HealthcareService). */
export const EncounterServiceTypeResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TEncounterServiceTypeResponse = z.infer<typeof EncounterServiceTypeResponseSchema>;

/** type[] CodeableConcept — clinical encounter type. */
export const EncounterTypeResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TEncounterTypeResponse = z.infer<typeof EncounterTypeResponseSchema>;

/** episodeOfCare[] Reference(EpisodeOfCare). */
export const EncounterEpisodeOfCareResponseSchema = z.object({
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TEncounterEpisodeOfCareResponse = z.infer<typeof EncounterEpisodeOfCareResponseSchema>;

/** basedOn[] Reference(ServiceRequest | CarePlan). */
export const EncounterBasedOnResponseSchema = z.object({
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TEncounterBasedOnResponse = z.infer<typeof EncounterBasedOnResponseSchema>;

/** careTeam[] Reference(CareTeam) — R5 new. */
export const EncounterCareTeamResponseSchema = z.object({
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TEncounterCareTeamResponse = z.infer<typeof EncounterCareTeamResponseSchema>;

/** Type code for a participant's role in the encounter. */
export const EncounterParticipantTypeResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TEncounterParticipantTypeResponse = z.infer<typeof EncounterParticipantTypeResponseSchema>;

/** participant[] BackboneElement — who was involved in the encounter. */
export const EncounterParticipantResponseSchema = z.object({
  type: z.array(EncounterParticipantTypeResponseSchema).nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TEncounterParticipantResponse = z.infer<typeof EncounterParticipantResponseSchema>;

/** appointment[] Reference(Appointment). */
export const EncounterAppointmentRefResponseSchema = z.object({
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TEncounterAppointmentRefResponse = z.infer<typeof EncounterAppointmentRefResponseSchema>;

/** virtualService[] VirtualServiceDetail — R5 telehealth info. */
export const EncounterVirtualServiceResponseSchema = z.object({
  channel_type_system: z.string().nullish(),
  channel_type_code: z.string().nullish(),
  channel_type_display: z.string().nullish(),
  address_url: z.string().nullish(),
  additional_info: z.string().nullish(),
  max_participants: z.number().nullish(),
  session_key: z.string().nullish(),
});
export type TEncounterVirtualServiceResponse = z.infer<typeof EncounterVirtualServiceResponseSchema>;

/** reason[].use[] CodeableConcept. */
export const EncounterReasonUseResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TEncounterReasonUseResponse = z.infer<typeof EncounterReasonUseResponseSchema>;

/** reason[].value[] CodeableReference. */
export const EncounterReasonValueResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TEncounterReasonValueResponse = z.infer<typeof EncounterReasonValueResponseSchema>;

/** reason[] BackboneElement — R5 consolidates R4 reasonCode + reasonReference. */
export const EncounterReasonResponseSchema = z.object({
  use: z.array(EncounterReasonUseResponseSchema).nullish(),
  value: z.array(EncounterReasonValueResponseSchema).nullish(),
});
export type TEncounterReasonResponse = z.infer<typeof EncounterReasonResponseSchema>;

/** diagnosis[].condition[] CodeableReference(Condition). */
export const EncounterDiagnosisConditionResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TEncounterDiagnosisConditionResponse = z.infer<typeof EncounterDiagnosisConditionResponseSchema>;

/** diagnosis[].use[] CodeableConcept — role of this diagnosis. */
export const EncounterDiagnosisUseResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TEncounterDiagnosisUseResponse = z.infer<typeof EncounterDiagnosisUseResponseSchema>;

/** diagnosis[] BackboneElement — clinical diagnoses. */
export const EncounterDiagnosisResponseSchema = z.object({
  condition: z.array(EncounterDiagnosisConditionResponseSchema).nullish(),
  use: z.array(EncounterDiagnosisUseResponseSchema).nullish(),
});
export type TEncounterDiagnosisResponse = z.infer<typeof EncounterDiagnosisResponseSchema>;

/** account[] Reference(Account) — billing accounts. */
export const EncounterAccountResponseSchema = z.object({
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TEncounterAccountResponse = z.infer<typeof EncounterAccountResponseSchema>;

/** admission BackboneElement — R5 renamed from R4 hospitalization. */
export const EncounterAdmissionResponseSchema = z.object({
  pre_admission_identifier_system: z.string().nullish(),
  pre_admission_identifier_value: z.string().nullish(),
  origin_type: z.string().nullish(),
  origin_id: z.number().nullish(),
  origin_display: z.string().nullish(),
  admit_source_system: z.string().nullish(),
  admit_source_code: z.string().nullish(),
  admit_source_display: z.string().nullish(),
  admit_source_text: z.string().nullish(),
  re_admission_system: z.string().nullish(),
  re_admission_code: z.string().nullish(),
  re_admission_display: z.string().nullish(),
  re_admission_text: z.string().nullish(),
  destination_type: z.string().nullish(),
  destination_id: z.number().nullish(),
  destination_display: z.string().nullish(),
  discharge_disposition_system: z.string().nullish(),
  discharge_disposition_code: z.string().nullish(),
  discharge_disposition_display: z.string().nullish(),
  discharge_disposition_text: z.string().nullish(),
});
export type TEncounterAdmissionResponse = z.infer<typeof EncounterAdmissionResponseSchema>;

/** location[] BackboneElement — where the encounter took place. */
export const EncounterLocationResponseSchema = z.object({
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
  status: z.string().nullish(),
  form_system: z.string().nullish(),
  form_code: z.string().nullish(),
  form_display: z.string().nullish(),
  form_text: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TEncounterLocationResponse = z.infer<typeof EncounterLocationResponseSchema>;

/** length Duration — how long the encounter lasted. */
export const EncounterLengthResponseSchema = z.object({
  value: z.number().nullish(),
  comparator: z.string().nullish(),
  unit: z.string().nullish(),
  system: z.string().nullish(),
  code: z.string().nullish(),
});
export type TEncounterLengthResponse = z.infer<typeof EncounterLengthResponseSchema>;

/** Generic flat CodeableConcept — used for dietPreference, specialArrangement, specialCourtesy. */
export const EncounterCodeableConceptResponseSchema = z.object({
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TEncounterCodeableConceptResponse = z.infer<typeof EncounterCodeableConceptResponseSchema>;

// ── Top-level response ────────────────────────────────────────────────────────

/**
 * Full Encounter plain-JSON response from fhir-gql.
 * All child arrays are embedded inline. Note the "class" key (not "class_").
 */
export const EncounterResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  /** planned | in-progress | on-hold | discharged | completed | cancelled | discontinued | entered-in-error | unknown */
  status: z.string().nullish(),

  // Priority (flat CodeableConcept)
  priority_system: z.string().nullish(),
  priority_code: z.string().nullish(),
  priority_display: z.string().nullish(),
  priority_text: z.string().nullish(),

  // Subject reference
  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),

  // subjectStatus (R5) — flat CodeableConcept
  subject_status_system: z.string().nullish(),
  subject_status_code: z.string().nullish(),
  subject_status_display: z.string().nullish(),
  subject_status_text: z.string().nullish(),

  // Timing
  actual_period_start: z.string().nullish(),
  actual_period_end: z.string().nullish(),
  planned_start_date: z.string().nullish(),
  planned_end_date: z.string().nullish(),

  // Length Duration (nested object)
  length: EncounterLengthResponseSchema.nullish(),

  // serviceProvider reference
  service_provider_type: z.string().nullish(),
  service_provider_id: z.number().nullish(),
  service_provider_display: z.string().nullish(),

  // partOf — integer ID of parent encounter
  part_of_id: z.number().nullish(),

  // Admission (0..1 BackboneElement, not an array)
  admission: EncounterAdmissionResponseSchema.nullish(),

  // Child arrays
  identifier: z.array(EncounterIdentifierResponseSchema).nullish(),
  status_history: z.array(EncounterStatusHistoryResponseSchema).nullish(),
  class_history: z.array(EncounterClassHistoryResponseSchema).nullish(),
  // JSON key is "class" (Python reserved word uses alias in fhir-gql)
  class: z.array(EncounterClassResponseSchema).nullish(),
  business_status: z.array(EncounterBusinessStatusResponseSchema).nullish(),
  service_type: z.array(EncounterServiceTypeResponseSchema).nullish(),
  type: z.array(EncounterTypeResponseSchema).nullish(),
  episode_of_care: z.array(EncounterEpisodeOfCareResponseSchema).nullish(),
  based_on: z.array(EncounterBasedOnResponseSchema).nullish(),
  care_team: z.array(EncounterCareTeamResponseSchema).nullish(),
  participant: z.array(EncounterParticipantResponseSchema).nullish(),
  appointment: z.array(EncounterAppointmentRefResponseSchema).nullish(),
  virtual_service: z.array(EncounterVirtualServiceResponseSchema).nullish(),
  reason: z.array(EncounterReasonResponseSchema).nullish(),
  diagnosis: z.array(EncounterDiagnosisResponseSchema).nullish(),
  account: z.array(EncounterAccountResponseSchema).nullish(),
  diet_preference: z.array(EncounterCodeableConceptResponseSchema).nullish(),
  special_arrangement: z.array(EncounterCodeableConceptResponseSchema).nullish(),
  special_courtesy: z.array(EncounterCodeableConceptResponseSchema).nullish(),
  location: z.array(EncounterLocationResponseSchema).nullish(),

  // Audit fields
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TEncounterResponse = z.infer<typeof EncounterResponseSchema>;

/** Paginated wrapper returned by GET /encounters/. */
export const PaginatedEncounterResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(EncounterResponseSchema),
});
export type TPaginatedEncounterResponse = z.infer<typeof PaginatedEncounterResponseSchema>;
