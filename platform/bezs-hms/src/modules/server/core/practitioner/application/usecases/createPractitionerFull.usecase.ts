/**
 * createPractitionerFullUseCase — atomically creates a Practitioner with sub-resources.
 * Layer: application / use cases
 *
 * Delegates to POST /practitioners/full on fhir-gql, which wraps the entire
 * creation in a single DB transaction. Prefer this over createPractitionerUseCase
 * when the caller has sub-resources to create at the same time.
 */
import { getInjection } from "@/modules/server/di/container";
import type { TCreatePractitionerFull } from "@/modules/entities/schemas/practitioner";
import type { TPractitionerResponse } from "@/modules/entities/schemas/practitioner";

/**
 * @param dto - Validated full-create payload (core fields + optional sub-resource arrays).
 * @returns The created Practitioner record with all nested sub-resources populated.
 */
export async function createPractitionerFullUseCase(
  dto: TCreatePractitionerFull,
): Promise<TPractitionerResponse> {
  return getInjection("IPractitionersService").createFull(dto);
}
