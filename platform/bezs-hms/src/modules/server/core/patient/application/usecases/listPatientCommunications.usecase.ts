/**
 * listPatientCommunicationsUseCase — lists all Communication sub-resources for a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function listPatientCommunicationsUseCase(patientId: number) {
  return getInjection("IPatientsService").listCommunications(patientId);
}
