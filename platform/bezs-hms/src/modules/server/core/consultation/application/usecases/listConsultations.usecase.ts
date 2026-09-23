/**
 * listConsultationsUseCase — paginated list of all AI Consultation records.
 *
 * Layer: server / core / consultation / application / usecases
 *
 * Delegates directly to IConsultationRepository (no service layer — consultation
 * uses the repository directly, unlike FHIR resources that have service wrappers).
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TListConsultationsQuery,
  TPaginatedConsultationResponse,
} from "@/modules/entities/schemas/consultation";

/**
 * Returns a paginated list of Consultation list items with optional filters.
 * Heavy JSON blobs (transcript, SOAP note, full report) are excluded for
 * list performance — use getByFhirAppointmentId for the full record.
 *
 * @param query - Optional filters (user_id, org_id, status, limit, offset).
 * @returns Paginated consultation list.
 */
export async function listConsultationsUseCase(
  query?: TListConsultationsQuery,
): Promise<TPaginatedConsultationResponse> {
  return getInjection("IConsultationRepository").list(query ?? {});
}
