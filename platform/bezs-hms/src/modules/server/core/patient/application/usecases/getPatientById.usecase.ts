/**
 * getPatientByIdUseCase — fetches a single Patient by ID.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

/**
 * @param id - The Patient primary key.
 * @returns The Patient record with all sub-resource arrays populated.
 */
export async function getPatientByIdUseCase(id: number): Promise<TPatientResponse> {
  return getInjection("IPatientsService").getById(id);
}
