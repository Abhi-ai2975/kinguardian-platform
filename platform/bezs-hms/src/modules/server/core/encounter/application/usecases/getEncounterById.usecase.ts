/**
 * getEncounterById use case.
 *
 * Layer: server / core / encounter / application / usecases
 *
 * Resolves the IEncounterService from DI and fetches a single Encounter by ID.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TEncounterResponse } from "@/modules/entities/schemas/encounter";

/**
 * Fetches a single Encounter by its integer database ID.
 *
 * @param id - The encounter's fhir-gql database ID.
 * @returns The Encounter resource.
 * @throws NotFoundError if the ID does not exist.
 */
export async function getEncounterByIdUseCase(id: number): Promise<TEncounterResponse> {
  const service = getInjection("IEncounterService");
  return service.getById(id);
}
