/**
 * createEncounter use case.
 *
 * Layer: server / core / encounter / application / usecases
 *
 * Resolves the IEncounterService from DI and delegates the create call.
 * Controller passes a validated TCreateEncounter — no additional validation here.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TCreateEncounter,
  type TEncounterResponse,
} from "@/modules/entities/schemas/encounter";

/**
 * Creates a new Encounter via the transport-agnostic IEncounterService.
 *
 * @param dto - Validated create payload from the controller.
 * @returns The created Encounter resource.
 */
export async function createEncounterUseCase(
  dto: TCreateEncounter,
): Promise<TEncounterResponse> {
  const service = getInjection("IEncounterService");
  return service.create(dto);
}
