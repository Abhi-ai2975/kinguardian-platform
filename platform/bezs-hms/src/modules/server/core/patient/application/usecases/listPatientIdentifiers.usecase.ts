/**
 * listPatientIdentifiersUseCase — lists all Identifier sub-resources for a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function listPatientIdentifiersUseCase(patientId: number) {
  return getInjection("IPatientsService").listIdentifiers(patientId);
}
