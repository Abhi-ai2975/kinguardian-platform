/**
 * Appointment response schemas.
 *
 * Layer: entities / schemas / appointment
 *
 * Mirrors the fhir-gql plain JSON response shapes (Accept: application/json).
 * All optional fields use .nullish() — the API returns explicit JSON null for
 * absent fields, not missing keys.
 *
 * All 14 child arrays are embedded inline in the top-level response — there
 * are no separate sub-resource routes for Appointment.
 *
 * Special note: the JSON key for the care-setting class array is literally
 * "class" (Python alias from reserved keyword class_).
 *
 * Reference: https://hl7.org/fhir/R4/appointment.html
 */

import { z } from "zod";

// ── Child sub-schemas ─────────────────────────────────────────────────────────

/** Business identifier on an Appointment. */
export const AppointmentIdentifierResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
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
export type TAppointmentIdentifierResponse = z.infer<typeof AppointmentIdentifierResponseSchema>;

/** Care-setting class (CodeableConcept) — JSON key is "class". */
export const AppointmentClassResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TAppointmentClassResponse = z.infer<typeof AppointmentClassResponseSchema>;

/** Broad service category (CodeableConcept) on an Appointment. */
export const AppointmentServiceCategoryResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TAppointmentServiceCategoryResponse = z.infer<typeof AppointmentServiceCategoryResponseSchema>;

/** Specific service type (CodeableReference) on an Appointment. */
export const AppointmentServiceTypeResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TAppointmentServiceTypeResponse = z.infer<typeof AppointmentServiceTypeResponseSchema>;

/** Clinical specialty (CodeableConcept) on an Appointment. */
export const AppointmentSpecialtyResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TAppointmentSpecialtyResponse = z.infer<typeof AppointmentSpecialtyResponseSchema>;

/** Reason for the appointment (CodeableReference). */
export const AppointmentReasonResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TAppointmentReasonResponse = z.infer<typeof AppointmentReasonResponseSchema>;

/** Supporting information reference on an Appointment. */
export const AppointmentSupportingInformationResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TAppointmentSupportingInformationResponse = z.infer<typeof AppointmentSupportingInformationResponseSchema>;

/** Slot reference linked to an Appointment. */
export const AppointmentSlotResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TAppointmentSlotResponse = z.infer<typeof AppointmentSlotResponseSchema>;

/** ServiceRequest/CarePlan reference this appointment is based on. */
export const AppointmentBasedOnResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TAppointmentBasedOnResponse = z.infer<typeof AppointmentBasedOnResponseSchema>;

/** Appointment this one replaces (used for rescheduling). */
export const AppointmentReplacesResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TAppointmentReplacesResponse = z.infer<typeof AppointmentReplacesResponseSchema>;

/** Virtual service (R5) — telehealth meeting details. */
export const AppointmentVirtualServiceResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  channel_type_system: z.string().nullish(),
  channel_type_code: z.string().nullish(),
  channel_type_display: z.string().nullish(),
  address_url: z.string().nullish(),
  additional_info: z.string().nullish(),
  max_participants: z.number().nullish(),
  session_key: z.string().nullish(),
});
export type TAppointmentVirtualServiceResponse = z.infer<typeof AppointmentVirtualServiceResponseSchema>;

/** Account reference (R5) — billing account for this appointment. */
export const AppointmentAccountResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TAppointmentAccountResponse = z.infer<typeof AppointmentAccountResponseSchema>;

/** Annotation note (R5) — free-text note on an Appointment. */
export const AppointmentNoteResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  author_string: z.string().nullish(),
  author_reference_type: z.string().nullish(),
  author_reference_id: z.number().nullish(),
  author_reference_display: z.string().nullish(),
  time: z.string().nullish(),
  text: z.string().nullish(),
});
export type TAppointmentNoteResponse = z.infer<typeof AppointmentNoteResponseSchema>;

/** Patient instruction (R5 CodeableReference). */
export const AppointmentPatientInstructionResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TAppointmentPatientInstructionResponse = z.infer<typeof AppointmentPatientInstructionResponseSchema>;

/** Role type a participant plays in an Appointment. */
export const AppointmentParticipantTypeResponseSchema = z.object({
  id: z.number().optional(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TAppointmentParticipantTypeResponse = z.infer<typeof AppointmentParticipantTypeResponseSchema>;

/** A participant (Practitioner, Patient, Location, etc.) in an Appointment. */
export const AppointmentParticipantResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
  required: z.boolean().nullish(),
  /** accepted | declined | tentative | needs-action */
  status: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  types: z.array(AppointmentParticipantTypeResponseSchema).nullish(),
});
export type TAppointmentParticipantResponse = z.infer<typeof AppointmentParticipantResponseSchema>;

/** Requested period (scheduling window preference). */
export const AppointmentRequestedPeriodResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TAppointmentRequestedPeriodResponse = z.infer<typeof AppointmentRequestedPeriodResponseSchema>;

/**
 * Recurrence template (R5) — one-to-one with the Appointment (not an array).
 * The weekly/monthly/yearly sub-template fields are flattened in the response.
 */
export const AppointmentRecurrenceTemplateResponseSchema = z.object({
  id: z.number(),
  org_id: z.string().nullish(),
  recurrence_type_code: z.string().nullish(),
  recurrence_type_display: z.string().nullish(),
  recurrence_type_system: z.string().nullish(),
  timezone_code: z.string().nullish(),
  timezone_display: z.string().nullish(),
  last_occurrence_date: z.string().nullish(),
  occurrence_count: z.number().nullish(),
  /** Serialised date list — parse with JSON.parse() if needed. */
  occurrence_dates: z.string().nullish(),
  /** Serialised date list. */
  excluding_dates: z.string().nullish(),
  /** Serialised int list. */
  excluding_recurrence_ids: z.string().nullish(),
  // Weekly template (flat)
  weekly_monday: z.boolean().nullish(),
  weekly_tuesday: z.boolean().nullish(),
  weekly_wednesday: z.boolean().nullish(),
  weekly_thursday: z.boolean().nullish(),
  weekly_friday: z.boolean().nullish(),
  weekly_saturday: z.boolean().nullish(),
  weekly_sunday: z.boolean().nullish(),
  weekly_week_interval: z.number().nullish(),
  // Monthly template (flat)
  monthly_day_of_month: z.number().nullish(),
  monthly_nth_week_code: z.string().nullish(),
  monthly_nth_week_display: z.string().nullish(),
  monthly_day_of_week_code: z.string().nullish(),
  monthly_day_of_week_display: z.string().nullish(),
  monthly_month_interval: z.number().nullish(),
  // Yearly template (flat)
  yearly_year_interval: z.number().nullish(),
});
export type TAppointmentRecurrenceTemplateResponse = z.infer<typeof AppointmentRecurrenceTemplateResponseSchema>;

// ── Top-level response ────────────────────────────────────────────────────────

/**
 * Full Appointment plain-JSON response from fhir-gql.
 * All child arrays are embedded inline. Note the "class" key (not "class_").
 */
export const AppointmentResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  /** proposed | pending | booked | arrived | fulfilled | cancelled | noshow | entered-in-error | checked-in | waitlist */
  status: z.string().nullish(),
  start: z.string().nullish(),
  end: z.string().nullish(),
  minutes_duration: z.number().nullish(),
  description: z.string().nullish(),
  created: z.string().nullish(),
  recurrence_id: z.number().nullish(),
  occurrence_changed: z.boolean().nullish(),
  // Subject reference
  subject_type: z.string().nullish(),
  subject_id: z.number().nullish(),
  subject_display: z.string().nullish(),
  // Related resource links
  encounter_id: z.number().nullish(),
  previous_appointment_id: z.number().nullish(),
  previous_appointment_display: z.string().nullish(),
  originating_appointment_id: z.number().nullish(),
  originating_appointment_display: z.string().nullish(),
  // Cancellation
  cancellation_date: z.string().nullish(),
  cancelation_reason_system: z.string().nullish(),
  cancelation_reason_code: z.string().nullish(),
  cancelation_reason_display: z.string().nullish(),
  cancelation_reason_text: z.string().nullish(),
  // Appointment type (flat CodeableConcept)
  appointment_type_system: z.string().nullish(),
  appointment_type_code: z.string().nullish(),
  appointment_type_display: z.string().nullish(),
  appointment_type_text: z.string().nullish(),
  // Priority (flat CodeableConcept, R5)
  priority_system: z.string().nullish(),
  priority_code: z.string().nullish(),
  priority_display: z.string().nullish(),
  priority_text: z.string().nullish(),
  // Child arrays
  identifier: z.array(AppointmentIdentifierResponseSchema).nullish(),
  // JSON key is "class" (Python reserved word uses alias in fhir-gql)
  class: z.array(AppointmentClassResponseSchema).nullish(),
  service_category: z.array(AppointmentServiceCategoryResponseSchema).nullish(),
  service_type: z.array(AppointmentServiceTypeResponseSchema).nullish(),
  specialty: z.array(AppointmentSpecialtyResponseSchema).nullish(),
  reason: z.array(AppointmentReasonResponseSchema).nullish(),
  supporting_information: z.array(AppointmentSupportingInformationResponseSchema).nullish(),
  slot: z.array(AppointmentSlotResponseSchema).nullish(),
  based_on: z.array(AppointmentBasedOnResponseSchema).nullish(),
  replaces: z.array(AppointmentReplacesResponseSchema).nullish(),
  virtual_service: z.array(AppointmentVirtualServiceResponseSchema).nullish(),
  account: z.array(AppointmentAccountResponseSchema).nullish(),
  note: z.array(AppointmentNoteResponseSchema).nullish(),
  patient_instruction: z.array(AppointmentPatientInstructionResponseSchema).nullish(),
  participant: z.array(AppointmentParticipantResponseSchema).nullish(),
  requested_period: z.array(AppointmentRequestedPeriodResponseSchema).nullish(),
  // One-to-one (not an array)
  recurrence_template: AppointmentRecurrenceTemplateResponseSchema.nullish(),
  // Audit fields
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TAppointmentResponse = z.infer<typeof AppointmentResponseSchema>;

/** Paginated wrapper returned by GET /appointments/ and GET /appointments/me. */
export const PaginatedAppointmentResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(AppointmentResponseSchema),
});
export type TPaginatedAppointmentResponse = z.infer<typeof PaginatedAppointmentResponseSchema>;
