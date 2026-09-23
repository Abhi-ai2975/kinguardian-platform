/**
 * AiConsultation repository interface.
 *
 * Layer: server / core / ai-consultation / domain
 *
 * Defines the persistence contract for standalone AI consultation sessions.
 * Implemented by AiConsultationPrismaRepository (local PostgreSQL via Prisma).
 * Registered in the DI container under IAiConsultationRepository.
 */

import type {
  TAiConsultationResponse,
  TCreateAiConsultation,
  TUpdateAiConsultation,
  TLinkAiConsultation,
  TAbandonAiConsultation,
} from "@/modules/entities/schemas/ai-consultation";

/**
 * Persistence contract for patient AI consultation sessions.
 * All methods throw domain errors on failure; never raw Prisma errors.
 */
export interface IAiConsultationRepository {
  /**
   * Creates a new IN_PROGRESS AI consultation session.
   *
   * @param dto - userId, org_id, optional patient_fhir_id, mode.
   * @returns The newly created AiConsultation record.
   */
  createAiConsultation(dto: TCreateAiConsultation): Promise<TAiConsultationResponse>;

  /**
   * Saves the conversation transcript and AI report, sets status to COMPLETED.
   *
   * @param dto - id, conversation array, optional report object.
   * @returns The updated AiConsultation record.
   * @throws NotFoundError if the record does not exist.
   */
  updateAiConsultation(dto: TUpdateAiConsultation): Promise<TAiConsultationResponse>;

  /**
   * Links a completed AI consultation to a follow-up FHIR appointment.
   * Sets fhir_appointment_id on the AiConsultation row.
   *
   * @param dto - id, fhir_appointment_id.
   * @returns The updated AiConsultation record.
   * @throws NotFoundError if the record does not exist.
   */
  linkToAppointment(dto: TLinkAiConsultation): Promise<TAiConsultationResponse>;

  /**
   * Marks an in-progress AI consultation as ABANDONED.
   * Called when the patient navigates away without completing.
   *
   * @param dto - id.
   * @returns The updated AiConsultation record.
   * @throws NotFoundError if the record does not exist.
   */
  abandonAiConsultation(
    dto: TAbandonAiConsultation,
  ): Promise<TAiConsultationResponse>;

  /**
   * Fetches a single AI consultation by its local integer ID.
   *
   * @param id - AiConsultation.id.
   * @returns The AiConsultation record.
   * @throws NotFoundError if not found.
   */
  getById(id: number): Promise<TAiConsultationResponse>;
}
