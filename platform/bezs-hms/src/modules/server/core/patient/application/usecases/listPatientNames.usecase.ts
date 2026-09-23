/**
 * listPatientNamesUseCase — lists all Name sub-resources for a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function listPatientNamesUseCase(patientId: number) {
  return getInjection("IPatientsService").listNames(patientId);
}
