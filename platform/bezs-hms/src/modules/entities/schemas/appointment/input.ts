/**
 * Appointment input/validation schemas.
 *
 * Layer: entities / schemas / appointment
 *
 * Contains write-side Zod schemas:
 *   - BookAppointmentValidationSchema — simplified booking (practitioner + slot + patient)
 *   - CreateAppointmentValidationSchema — full FHIR create with all 15 child arrays
 *   - UpdateAppointmentValidationSchema — scalar-only patch
 *   - ListAppointmentsValidationSchema — paginated list with filters
 *   - GetMyAppointmentsValidationSchema — caller's own appointments
 *   - GetByIdAppointmentValidationSchema / DeleteAppointmentValidationSchema
 *
 * Key constraints:
 *   - status and participant (min 1) are required on full create
 *   - Child arrays are immutable after creation (delete + recreate to change)
 *   - recurrence_template is a single optional object, not an array
 *   - JSON key for care-setting class array is "class" (Python reserved word)
 */

import { z } from "zod";

// ── Enums ─────────────────────────────────────────────────────────────────────

/** Valid Appointment lifecycle status values (FHIR R4 + R5 additions). */
export const AppointmentStatusSchema = z.enum([
  "proposed",
  "pending",
  "booked",
  "arrived",
  "fulfilled",
  "cancelled",
  "noshow",
  "entered-in-error",
  "checked-in",
  "waitlist",
]);
export type TAppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

/** Valid Appointment participant status values. */
export const AppointmentParticipantStatusSchema = z.enum([
  "accepted",
  "declined",
  "tentative",
  "needs-action",
]);
export type TAppointmentParticipantStatus = z.infer<typeof AppointmentParticipantStatusSchema>;

// ── Simplified booking ────────────────────────────────────────────────────────

/**
 * Schema for the simplified POST /appointments/book endpoint.
 * fhir-gql auto-builds participants, links the slot, and marks it busy atomically.
 * Returns 409 Conflict if the slot is no longer free.
 */
export const BookAppointmentValidationSchema = z.object({
  /** Integer ID of the Practitioner to book with. */
  practitioner_id: z.number().int().positive(),
  /** Integer ID of the free Slot — must have status="free". */
  slot_id: z.number().int().positive(),
  /** Integer ID of the Patient being booked. */
  patient_id: z.number().int().positive(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  /** Display name of the practitioner — stored as the Practitioner participant's reference_display. */
  practitioner_display: z.string().optional(),
  /** Display name of the patient — stored as the Patient participant's reference_display. */
  patient_display: z.string().optional(),
  /**
   * Appointment type — all four fields default to the booked Slot's own values,
   * which fhir-gql copies across during booking. Only send these to override the
   * Slot; they move as a group, so supplying a code replaces the Slot's system
   * and display too rather than merging.
   *
   * Must be set at booking time: the fhir-server's Appointment patch schema has
   * no appointment_type_* fields, so the type cannot be added afterwards.
   *
   * Free strings, not an enum — FHIR binds appointmentType as *preferred*, so
   * local code systems are legal. Common v2-0276 codes: ROUTINE (the value set's
   * own default), CHECKUP, FOLLOWUP, WALKIN, EMERGENCY.
   */
  appointment_type_system: z.string().optional(),
  appointment_type_code: z.string().optional(),
  appointment_type_display: z.string().optional(),
  appointment_type_text: z.string().optional(),
  service_type_code: z.string().optional(),
  service_type_display: z.string().optional(),
  reason_code: z.string().optional(),
  reason_text: z.string().optional(),
  description: z.string().optional(),
  comment: z.string().optional(),
});
export type TBookAppointment = z.infer<typeof BookAppointmentValidationSchema>;

// ── Full FHIR create — child array input schemas ───────────────────────────────

const AppointmentIdentifierInputSchema = z.object({
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

const AppointmentClassInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const AppointmentServiceCategoryInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const AppointmentServiceTypeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
  /** FHIR ref e.g. "HealthcareService/501". */
  reference: z.string().optional(),
  reference_display: z.string().optional(),
});

const AppointmentSpecialtyInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const AppointmentReasonInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
  /** FHIR ref e.g. "Condition/12345". */
  reference: z.string().optional(),
  reference_display: z.string().optional(),
});

const AppointmentSupportingInformationInputSchema = z.object({
  reference: z.string().min(1),
  reference_display: z.string().optional(),
});

const AppointmentSlotInputSchema = z.object({
  /** FHIR ref e.g. "Slot/501". */
  reference: z.string().min(1),
  reference_display: z.string().optional(),
});

const AppointmentBasedOnInputSchema = z.object({
  /** FHIR ref e.g. "ServiceRequest/80001". */
  reference: z.string().min(1),
  reference_display: z.string().optional(),
});

const AppointmentReplacesInputSchema = z.object({
  /** FHIR ref to the cancelled Appointment e.g. "Appointment/40001". */
  reference: z.string().min(1),
  reference_display: z.string().optional(),
});

const AppointmentVirtualServiceInputSchema = z.object({
  channel_type_system: z.string().optional(),
  /** e.g. "zoom" | "teams" | "webex". */
  channel_type_code: z.string().optional(),
  channel_type_display: z.string().optional(),
  address_url: z.string().optional(),
  additional_info: z.array(z.string()).optional(),
  max_participants: z.number().int().min(1).optional(),
  session_key: z.string().optional(),
});

const AppointmentAccountInputSchema = z.object({
  /** FHIR ref e.g. "Account/601". */
  reference: z.string().min(1),
  reference_display: z.string().optional(),
});

const AppointmentNoteInputSchema = z.object({
  author_string: z.string().optional(),
  /** FHIR ref e.g. "Practitioner/30001". */
  author_reference: z.string().optional(),
  author_reference_display: z.string().optional(),
  time: z.string().optional(),
  text: z.string().min(1),
});

const AppointmentPatientInstructionInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
  reference: z.string().optional(),
  reference_display: z.string().optional(),
});

const AppointmentParticipantTypeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});

const AppointmentParticipantInputSchema = z.object({
  /** FHIR ref e.g. "Practitioner/30001" | "Patient/10001". */
  reference: z.string().optional(),
  reference_display: z.string().optional(),
  types: z.array(AppointmentParticipantTypeInputSchema).optional(),
  required: z.boolean().optional(),
  status: AppointmentParticipantStatusSchema.optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

const AppointmentRequestedPeriodInputSchema = z.object({
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});

// ── Recurrence template (R5) ──────────────────────────────────────────────────

const RecurrenceWeeklyTemplateInputSchema = z.object({
  monday: z.boolean().optional(),
  tuesday: z.boolean().optional(),
  wednesday: z.boolean().optional(),
  thursday: z.boolean().optional(),
  friday: z.boolean().optional(),
  saturday: z.boolean().optional(),
  sunday: z.boolean().optional(),
  week_interval: z.number().int().min(1).optional(),
});

const RecurrenceMonthlyTemplateInputSchema = z.object({
  day_of_month: z.number().int().optional(),
  nth_week_code: z.string().optional(),
  nth_week_display: z.string().optional(),
  day_of_week_code: z.string().optional(),
  day_of_week_display: z.string().optional(),
  month_interval: z.number().int().min(1),
});

const RecurrenceYearlyTemplateInputSchema = z.object({
  year_interval: z.number().int().min(1),
});

/**
 * Recurrence template — single object (not array), one-to-one with the Appointment.
 * Use weekly_template, monthly_template, or yearly_template depending on recurrence_type_code.
 */
export const RecurrenceTemplateInputSchema = z.object({
  /** daily | weekly | monthly | yearly */
  recurrence_type_code: z.string().min(1),
  recurrence_type_display: z.string().optional(),
  recurrence_type_system: z.string().optional(),
  /** IANA timezone e.g. "America/New_York". */
  timezone_code: z.string().optional(),
  timezone_display: z.string().optional(),
  last_occurrence_date: z.string().optional(),
  occurrence_count: z.number().int().min(1).optional(),
  occurrence_dates: z.array(z.string()).optional(),
  excluding_dates: z.array(z.string()).optional(),
  excluding_recurrence_ids: z.array(z.number().int()).optional(),
  weekly_template: RecurrenceWeeklyTemplateInputSchema.optional(),
  monthly_template: RecurrenceMonthlyTemplateInputSchema.optional(),
  yearly_template: RecurrenceYearlyTemplateInputSchema.optional(),
});
export type TRecurrenceTemplateInput = z.infer<typeof RecurrenceTemplateInputSchema>;

// ── Full FHIR create ──────────────────────────────────────────────────────────

/**
 * Schema for POST /appointments/ — full FHIR create.
 * status and participant (min 1 entry) are required.
 * All child arrays are accepted inline and created atomically.
 */
export const CreateAppointmentValidationSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  status: AppointmentStatusSchema,
  start: z.string().optional(),
  end: z.string().optional(),
  minutes_duration: z.number().int().min(1).optional(),
  description: z.string().optional(),
  created: z.string().optional(),
  recurrence_id: z.number().int().min(1).optional(),
  occurrence_changed: z.boolean().optional(),
  // Subject
  subject: z.string().optional(),
  subject_display: z.string().optional(),
  // Related resource links
  encounter_id: z.number().int().optional(),
  previous_appointment_id: z.number().int().optional(),
  previous_appointment_display: z.string().optional(),
  originating_appointment_id: z.number().int().optional(),
  originating_appointment_display: z.string().optional(),
  // Appointment type
  appointment_type_system: z.string().optional(),
  appointment_type_code: z.string().optional(),
  appointment_type_display: z.string().optional(),
  appointment_type_text: z.string().optional(),
  // Priority (R5 CodeableConcept)
  priority_system: z.string().optional(),
  priority_code: z.string().optional(),
  priority_display: z.string().optional(),
  priority_text: z.string().optional(),
  // Cancellation
  cancellation_date: z.string().optional(),
  cancelation_reason_system: z.string().optional(),
  cancelation_reason_code: z.string().optional(),
  cancelation_reason_display: z.string().optional(),
  cancelation_reason_text: z.string().optional(),
  // Child arrays — all optional except participant
  identifier: z.array(AppointmentIdentifierInputSchema).optional(),
  // JSON key is "class" (Python reserved word uses alias in fhir-gql)
  class: z.array(AppointmentClassInputSchema).optional(),
  service_category: z.array(AppointmentServiceCategoryInputSchema).optional(),
  service_type: z.array(AppointmentServiceTypeInputSchema).optional(),
  specialty: z.array(AppointmentSpecialtyInputSchema).optional(),
  reason: z.array(AppointmentReasonInputSchema).optional(),
  supporting_information: z.array(AppointmentSupportingInformationInputSchema).optional(),
  slot: z.array(AppointmentSlotInputSchema).optional(),
  based_on: z.array(AppointmentBasedOnInputSchema).optional(),
  replaces: z.array(AppointmentReplacesInputSchema).optional(),
  virtual_service: z.array(AppointmentVirtualServiceInputSchema).optional(),
  account: z.array(AppointmentAccountInputSchema).optional(),
  note: z.array(AppointmentNoteInputSchema).optional(),
  patient_instruction: z.array(AppointmentPatientInstructionInputSchema).optional(),
  /** At least 1 participant required. */
  participant: z.array(AppointmentParticipantInputSchema).min(1),
  requested_period: z.array(AppointmentRequestedPeriodInputSchema).optional(),
  // One-to-one recurrence template (not an array)
  recurrence_template: RecurrenceTemplateInputSchema.optional(),
});
export type TCreateAppointment = z.infer<typeof CreateAppointmentValidationSchema>;

// ── Patch ─────────────────────────────────────────────────────────────────────

/**
 * Patchable scalar fields only.
 * Child arrays are immutable — delete and recreate the appointment to change them.
 */
const AppointmentPatchBaseSchema = z.object({
  status: AppointmentStatusSchema.optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  minutes_duration: z.number().int().min(1).optional(),
  description: z.string().optional(),
  recurrence_id: z.number().int().min(1).optional(),
  occurrence_changed: z.boolean().optional(),
  cancellation_date: z.string().optional(),
  cancelation_reason_system: z.string().optional(),
  cancelation_reason_code: z.string().optional(),
  cancelation_reason_display: z.string().optional(),
  cancelation_reason_text: z.string().optional(),
  priority_system: z.string().optional(),
  priority_code: z.string().optional(),
  priority_display: z.string().optional(),
  priority_text: z.string().optional(),
});

/** DTO type (API body) for PATCH /appointments/{id}. Does not include id. */
export const AppointmentPatchDtoSchema = AppointmentPatchBaseSchema;
export type TAppointmentPatchDto = z.infer<typeof AppointmentPatchDtoSchema>;

/** Full validation schema for an update action (includes id for controller routing). */
export const UpdateAppointmentValidationSchema = AppointmentPatchBaseSchema.extend({
  id: z.number().int().positive(),
});
export type TUpdateAppointment = z.infer<typeof UpdateAppointmentValidationSchema>;

// ── List / query ──────────────────────────────────────────────────────────────

/** Query params for GET /appointments/ (admin cross-tenant list). */
export const ListAppointmentsValidationSchema = z.object({
  status: AppointmentStatusSchema.optional(),
  patient_id: z.number().int().optional(),
  /** Filter appointments where this practitioner is a participant (integer FHIR Practitioner.id). */
  practitioner_id: z.number().int().optional(),
  /** Filter by appointment start ≥ this datetime (ISO 8601). */
  start_from: z.string().optional(),
  /** Filter by appointment start ≤ this datetime (ISO 8601). */
  start_to: z.string().optional(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListAppointmentsQuery = z.infer<typeof ListAppointmentsValidationSchema>;

/**
 * Payload for GET /appointments/me — caller's own appointments.
 * userId is injected by the action from the session; it is not exposed as a
 * client-supplied query param (prevents tenant data leakage).
 */
export const GetMyAppointmentsValidationSchema = z.object({
  /** Injected from session by the server action — never supplied by the client directly. */
  userId: z.string(),
  status: AppointmentStatusSchema.optional(),
  start_from: z.string().optional(),
  start_to: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TGetMyAppointments = z.infer<typeof GetMyAppointmentsValidationSchema>;

/** Schema for fetching a single Appointment by ID. */
export const GetByIdAppointmentValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TGetByIdAppointment = z.infer<typeof GetByIdAppointmentValidationSchema>;

/** Schema for deleting an Appointment by ID. */
export const DeleteAppointmentValidationSchema = z.object({
  id: z.number().int().positive(),
});
export type TDeleteAppointment = z.infer<typeof DeleteAppointmentValidationSchema>;

/**
 * Schema for POST /appointments/{id}/reschedule.
 * The backend atomically frees the old slot, updates appointment timing,
 * and marks the new slot as busy — the client only needs to supply the new slot ID.
 */
export const RescheduleAppointmentValidationSchema = z.object({
  /** ID of the appointment to reschedule. */
  id: z.number().int().positive(),
  /** Integer ID of the new free Slot to move the appointment to. */
  new_slot_id: z.number().int().positive(),
});
export type TRescheduleAppointment = z.infer<typeof RescheduleAppointmentValidationSchema>;
