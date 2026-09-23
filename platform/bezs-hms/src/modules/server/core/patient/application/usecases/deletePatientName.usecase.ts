/**
 * deletePatientNameUseCase — removes a specific Name sub-resource from a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function deletePatientNameUseCase(patientId: number, itemId: number): Promise<void> {
  return getInjection("IPatientsService").deleteName(patientId, itemId);
}
