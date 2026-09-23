/**
 * createServiceRequest use case.
 *
 * Layer: server / core / service-request / application / usecases
 *
 * Resolves IServiceRequestService from DI and delegates the create call.
 * Controller passes a validated TCreateServiceRequest — no additional validation here.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TCreateServiceRequest,
  type TServiceRequestResponse,
} from "@/modules/entities/schemas/service-request";

/**
 * Creates a new ServiceRequest via the transport-agnostic IServiceRequestService.
 *
 * @param dto - Validated create payload (status + intent required).
 * @returns The created ServiceRequest resource.
 */
export async function createServiceRequestUseCase(
  dto: TCreateServiceRequest,
): Promise<TServiceRequestResponse> {
  const service = getInjection("IServiceRequestService");
  return service.create(dto);
}
