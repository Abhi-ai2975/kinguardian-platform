/**
 * updateObservation use case.
 *
 * Layer: server / core / observation / application / usecases
 *
 * Resolves IObservationService from DI and delegates the patch call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TUpdateObservationDto,
  type TObservationResponse,
} from "@/modules/entities/schemas/observation";

/**
 * Patches scalar fields on an existing Observation.
 *
 * @param id - fhir-gql database ID of the resource to update.
 * @param dto - Scalar patch payload (status, value[x] fields, etc.).
 * @returns The updated Observation resource.
 */
export async function updateObservationUseCase(
  id: number,
  dto: TUpdateObservationDto,
): Promise<TObservationResponse> {
  const service = getInjection("IObservationService");
  return service.update(id, dto);
}
