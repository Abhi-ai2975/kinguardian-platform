/**
 * updatePatientFullUseCase — atomically updates a Patient with sub-resources.
 * Layer: application / use cases
 *
 * Delegates to PATCH /patients/{id}/full on fhir-gql, which wraps all scalar
 * and sub-resource changes in a single DB transaction.
 */
import { getInjection } from "@/modules/server/di/container";
import type { TUpdatePatientFullDto } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

/**
 * @param id  - The Patient primary key.
 * @param dto - Validated full-update payload (scalar fields + optional sub-resource arrays).
 * @returns The updated Patient record with all nested sub-resources populated.
 */
export async function updatePatientFullUseCase(
  id: number,
  dto: TUpdatePatientFullDto,
): Promise<TPatientResponse> {
  return getInjection("IPatientsService").updateFull(id, dto);
}
