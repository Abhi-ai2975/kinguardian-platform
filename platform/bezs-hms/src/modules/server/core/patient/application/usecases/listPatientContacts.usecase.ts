/**
 * listPatientContactsUseCase — lists all Contact sub-resources for a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function listPatientContactsUseCase(patientId: number) {
  return getInjection("IPatientsService").listContacts(patientId);
}
