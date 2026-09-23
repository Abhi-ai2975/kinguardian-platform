/**
 * deletePatientContactUseCase — removes a specific Contact sub-resource from a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function deletePatientContactUseCase(patientId: number, itemId: number): Promise<void> {
  return getInjection("IPatientsService").deleteContact(patientId, itemId);
}
