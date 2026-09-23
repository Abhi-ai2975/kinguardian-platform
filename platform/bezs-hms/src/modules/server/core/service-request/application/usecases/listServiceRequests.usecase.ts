/**
 * listServiceRequests use case.
 *
 * Layer: server / core / service-request / application / usecases
 *
 * Resolves IServiceRequestService from DI and delegates the list call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TListServiceRequestsQuery,
  type TPaginatedServiceRequestResponse,
} from "@/modules/entities/schemas/service-request";

/**
 * Returns a paginated list of ServiceRequests with optional filters.
 *
 * @param query - Optional filter params (status, patient_id, authored_from/to, etc.).
 * @returns Paginated ServiceRequest response.
 */
export async function listServiceRequestsUseCase(
  query?: TListServiceRequestsQuery,
): Promise<TPaginatedServiceRequestResponse> {
  const service = getInjection("IServiceRequestService");
  return service.list(query);
}
