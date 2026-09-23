/**
 * deletePatientCommunicationUseCase — removes a specific Communication sub-resource from a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function deletePatientCommunicationUseCase(patientId: number, itemId: number): Promise<void> {
  return getInjection("IPatientsService").deleteCommunication(patientId, itemId);
}
