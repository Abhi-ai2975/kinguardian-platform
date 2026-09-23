/**
 * patchPatientCommunicationUseCase — updates a specific Communication sub-resource on a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TPatchPatientCommunication, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function patchPatientCommunicationUseCase(patientId: number, itemId: number, dto: TPatchPatientCommunication): Promise<TPatientResponse> {
  return getInjection("IPatientsService").patchCommunication(patientId, itemId, dto);
}
