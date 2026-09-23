/**
 * Consultation repository interface.
 *
 * Layer: server / core / consultation / domain
 *
 * Defines the persistence contract for the local Consultation resource.
 * Implemented by ConsultationPrismaRepository (local PostgreSQL via Prisma).
 * Registered in the DI container under IConsultationRepository.
 */

import type {
  TConsultationResponse,
  TPaginatedConsultationResponse,
  TCreateConsultation,
  TCompleteConsultation,
  TSaveClinicalData,
  TAbandonConsultation,
  TListConsultationsQuery,
} from "@/modules/entities/schemas/consultation";

/**
 * Persistence contract for virtual consultation sessions.
 * All methods throw domain errors on failure; never raw Prisma errors.
 */
export interface IConsultationRepository {
  /**
   * Provisions a new WAITING consultation with a generated LiveKit room ID.
   * Called immediately after a FHIR appointment is booked successfully.
   *
   * @param dto - fhir_appointment_id, user_id, optional org_id.
   * @returns The newly created Consultation record.
   */
  create(dto: TCreateConsultation): Promise<TConsultationResponse>;

  /**
   * Writes the consultation transcript, SOAP note, and full merged report,
   * then sets status to COMPLETED. Called by the doctor on end-call.
   *
   * @param dto - fhir_appointment_id, virtual_conversation, soap_note, full_report.
   * @returns The updated Consultation record.
   * @throws NotFoundError if no consultation exists for this appointment.
   */
  complete(dto: TCompleteConsultation): Promise<TConsultationResponse>;

  /**
   * Writes the FHIR clinical resources extracted from the SOAP note by
   * the clinical-extraction-agent. Called in the post-consultation review step.
   *
   * @param dto - fhir_appointment_id + resource arrays.
   * @returns The updated Consultation record.
   * @throws NotFoundError if no consultation exists for this appointment.
   */
  saveClinicalData(dto: TSaveClinicalData): Promise<TConsultationResponse>;

  /**
   * Marks a consultation as ABANDONED (participant left without completing).
   *
   * @param dto - fhir_appointment_id.
   * @returns The updated Consultation record.
   * @throws NotFoundError if no consultation exists for this appointment.
   */
  abandon(dto: TAbandonConsultation): Promise<TConsultationResponse>;

  /**
   * Fetches the consultation linked to a specific FHIR appointment.
   * Returns null when no consultation was provisioned (appointment not yet booked
   * or booking predates the feature).
   *
   * @param fhirAppointmentId - FHIR Appointment.id (integer).
   * @returns The Consultation record, or null if not found.
   */
  getByFhirAppointmentId(
    fhirAppointmentId: number,
  ): Promise<TConsultationResponse | null>;

  /**
   * Returns a paginated list of consultation records with optional filters.
   * Returns lightweight list items (no JSON blobs) for performance.
   *
   * @param query - Optional filters (user_id, org_id, status, limit, offset).
   * @returns Paginated consultation list.
   */
  list(query?: TListConsultationsQuery): Promise<TPaginatedConsultationResponse>;
}
