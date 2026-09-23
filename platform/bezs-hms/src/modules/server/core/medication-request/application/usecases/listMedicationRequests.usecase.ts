/**
 * listMedicationRequests use case.
 *
 * Layer: server / core / medication-request / application / usecases
 *
 * Resolves IMedicationRequestService from DI and delegates the list call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TListMedicationRequestsQuery,
  type TPaginatedMedicationRequestResponse,
} from "@/modules/entities/schemas/medication-request";

/**
 * Returns a paginated list of MedicationRequests with optional filters.
 *
 * @param query - Optional filter params (status, patient_id, authored_from/to, etc.).
 * @returns Paginated MedicationRequest response.
 */
export async function listMedicationRequestsUseCase(
  query?: TListMedicationRequestsQuery,
): Promise<TPaginatedMedicationRequestResponse> {
  const service = getInjection("IMedicationRequestService");
  return service.list(query);
}
