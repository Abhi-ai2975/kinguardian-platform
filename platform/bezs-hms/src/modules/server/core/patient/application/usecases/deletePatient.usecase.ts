/**
 * deletePatientUseCase — permanently deletes a Patient and all child records.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

/**
 * @param id - The Patient primary key.
 */
export async function deletePatientUseCase(id: number): Promise<void> {
  return getInjection("IPatientsService").delete(id);
}
