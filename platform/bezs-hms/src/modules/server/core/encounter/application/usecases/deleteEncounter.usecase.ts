/**
 * deleteEncounter use case.
 *
 * Layer: server / core / encounter / application / usecases
 *
 * Resolves the IEncounterService from DI and permanently deletes an Encounter
 * along with all its cascading child records.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently deletes an Encounter and all child records (cascade).
 *
 * @param id - The encounter's fhir-gql database ID.
 * @throws NotFoundError if the ID does not exist.
 */
export async function deleteEncounterUseCase(id: number): Promise<void> {
  const service = getInjection("IEncounterService");
  return service.delete(id);
}
