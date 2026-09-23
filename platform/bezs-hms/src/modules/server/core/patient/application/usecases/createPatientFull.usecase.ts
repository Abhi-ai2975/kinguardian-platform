/**
 * createPatientFullUseCase — atomically creates a Patient with sub-resources.
 * Layer: application / use cases
 *
 * Delegates to POST /patients/full on fhir-gql, which wraps the entire
 * creation in a single DB transaction. Prefer this over createPatientUseCase
 * when the caller has sub-resources to create at the same time.
 */
import { getInjection } from "@/modules/server/di/container";
import type { TCreatePatientFull } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

/**
 * @param dto - Validated full-create payload (core fields + optional sub-resource arrays).
 * @returns The created Patient record with all nested sub-resources populated.
 */
export async function createPatientFullUseCase(
  dto: TCreatePatientFull,
): Promise<TPatientResponse> {
  return getInjection("IPatientsService").createFull(dto);
}
