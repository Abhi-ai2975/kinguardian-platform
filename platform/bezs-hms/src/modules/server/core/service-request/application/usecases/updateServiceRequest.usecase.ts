/**
 * updateServiceRequest use case.
 *
 * Layer: server / core / service-request / application / usecases
 *
 * Resolves IServiceRequestService from DI and delegates the patch call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TUpdateServiceRequestDto,
  type TServiceRequestResponse,
} from "@/modules/entities/schemas/service-request";

/**
 * Patches scalar fields on an existing ServiceRequest.
 *
 * @param id - fhir-gql database ID of the resource to update.
 * @param dto - Scalar patch payload (all fields optional).
 * @returns The updated ServiceRequest resource.
 */
export async function updateServiceRequestUseCase(
  id: number,
  dto: TUpdateServiceRequestDto,
): Promise<TServiceRequestResponse> {
  const service = getInjection("IServiceRequestService");
  return service.update(id, dto);
}
