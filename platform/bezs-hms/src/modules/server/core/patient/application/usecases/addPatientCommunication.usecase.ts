/**
 * addPatientCommunicationUseCase — adds a Communication sub-resource to a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TAddPatientCommunication, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function addPatientCommunicationUseCase(patientId: number, dto: TAddPatientCommunication): Promise<TPatientResponse> {
  return getInjection("IPatientsService").addCommunication(patientId, dto);
}
