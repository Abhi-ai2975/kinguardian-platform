/**
 * createObservation use case.
 *
 * Layer: server / core / observation / application / usecases
 *
 * Resolves IObservationService from DI and delegates the create call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TCreateObservation,
  type TObservationResponse,
} from "@/modules/entities/schemas/observation";

/**
 * Creates a new Observation via the transport-agnostic IObservationService.
 *
 * @param dto - Validated create payload (status required; value[x] fields optional).
 * @returns The created Observation resource.
 */
export async function createObservationUseCase(
  dto: TCreateObservation,
): Promise<TObservationResponse> {
  const service = getInjection("IObservationService");
  return service.create(dto);
}
