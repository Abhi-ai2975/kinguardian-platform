/**
 * Intake repository interface.
 *
 * Layer: server / core / intake / domain
 *
 * Defines the persistence contract for the local Intake resource.
 * Implemented by IntakePrismaRepository (local PostgreSQL via Prisma).
 * Registered in the DI container under IIntakeRepository.
 */

import type {
  TIntakeResponse,
  TPaginatedIntakeResponse,
  TCreateIntake,
  TUpdateIntake,
  TLinkIntake,
  TAbandonIntake,
  TListIntakesQuery,
} from "@/modules/entities/schemas/intake";

/**
 * Persistence contract for patient intake sessions.
 * All methods throw domain errors on failure; never raw Prisma errors.
 */
export interface IIntakeRepository {
  /**
   * Creates a new IN_PROGRESS intake session.
   *
   * @param dto - userId, org_id, optional patient_fhir_id, mode.
   * @returns The newly created Intake record.
   */
  createIntake(dto: TCreateIntake): Promise<TIntakeResponse>;

  /**
   * Saves the conversation transcript and AI report, sets status to COMPLETED.
   *
   * @param dto - id, conversation array, optional report object.
   * @returns The updated Intake record.
   * @throws NotFoundError if the intake does not exist.
   */
  updateIntake(dto: TUpdateIntake): Promise<TIntakeResponse>;

  /**
   * Links a completed intake to its downstream FHIR appointment.
   * Sets fhir_appointment_id on the Intake row.
   *
   * @param dto - id, fhir_appointment_id.
   * @returns The updated Intake record.
   * @throws NotFoundError if the intake does not exist.
   */
  linkToAppointment(dto: TLinkIntake): Promise<TIntakeResponse>;

  /**
   * Marks an in-progress intake as ABANDONED.
   * Called when the patient navigates away without completing.
   *
   * @param dto - id.
   * @returns The updated Intake record.
   * @throws NotFoundError if the intake does not exist.
   */
  abandonIntake(dto: TAbandonIntake): Promise<TIntakeResponse>;

  /**
   * Fetches a single intake by its local integer ID.
   *
   * @param id - Intake.id.
   * @returns The Intake record.
   * @throws NotFoundError if not found.
   */
  getById(id: number): Promise<TIntakeResponse>;

  /**
   * Fetches the intake linked to a specific FHIR appointment.
   * Used by doctors to retrieve the pre-appointment clinical context.
   *
   * @param fhirAppointmentId - FHIR Appointment.id (integer).
   * @returns The linked Intake record, or null if no intake was linked.
   */
  getByFhirAppointmentId(fhirAppointmentId: number): Promise<TIntakeResponse | null>;

  /**
   * Returns a paginated list of intake records with optional filters.
   *
   * @param query - Optional filters (user_id, org_id, status, mode, limit, offset).
   * @returns Paginated intake list.
   */
  list(query?: TListIntakesQuery): Promise<TPaginatedIntakeResponse>;
}
