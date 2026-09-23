/**
 * deletePatientTelecomUseCase — removes a specific Telecom sub-resource from a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function deletePatientTelecomUseCase(patientId: number, itemId: number): Promise<void> {
  return getInjection("IPatientsService").deleteTelecom(patientId, itemId);
}
