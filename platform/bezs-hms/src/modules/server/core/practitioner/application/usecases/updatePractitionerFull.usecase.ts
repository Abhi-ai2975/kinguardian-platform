/**
 * updatePractitionerFullUseCase — atomically updates a Practitioner with sub-resources.
 * Layer: application / use cases
 *
 * Delegates to PATCH /practitioners/{id}/full on fhir-gql, which wraps all scalar
 * and sub-resource changes in a single DB transaction.
 */
import { getInjection } from "@/modules/server/di/container";
import type { TUpdatePractitionerFullDto } from "@/modules/entities/schemas/practitioner";
import type { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";

/**
 * @param id  - The Practitioner primary key.
 * @param dto - Validated full-update payload (scalar fields + optional sub-resource arrays).
 * @returns The updated Practitioner record with all nested sub-resources populated.
 */
export async function updatePractitionerFullUseCase(
  id: number,
  dto: TUpdatePractitionerFullDto,
): Promise<TPractitionerResponse> {
  return getInjection("IPractitionersService").updateFull(id, dto);
}
