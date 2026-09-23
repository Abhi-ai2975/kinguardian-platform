/**
 * updateEncounter use case.
 *
 * Layer: server / core / encounter / application / usecases
 *
 * Resolves the IEncounterService from DI and patches scalar fields on an Encounter.
 * The controller strips the `id` from the validated payload before passing the DTO here.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TUpdateEncounterDto,
  type TEncounterResponse,
} from "@/modules/entities/schemas/encounter";

/**
 * Partially updates scalar fields on an existing Encounter.
 *
 * @param id - The encounter's fhir-gql database ID.
 * @param dto - Scalar patch payload (id excluded — controller strips it).
 * @returns The updated Encounter resource.
 */
export async function updateEncounterUseCase(
  id: number,
  dto: TUpdateEncounterDto,
): Promise<TEncounterResponse> {
  const service = getInjection("IEncounterService");
  return service.update(id, dto);
}
