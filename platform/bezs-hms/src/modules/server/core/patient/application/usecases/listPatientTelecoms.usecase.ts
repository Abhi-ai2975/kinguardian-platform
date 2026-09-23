/**
 * listPatientTelecomsUseCase — lists all Telecom sub-resources for a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function listPatientTelecomsUseCase(patientId: number) {
  return getInjection("IPatientsService").listTelecoms(patientId);
}
