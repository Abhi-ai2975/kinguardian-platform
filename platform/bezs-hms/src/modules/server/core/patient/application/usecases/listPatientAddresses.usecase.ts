/**
 * listPatientAddressesUseCase — lists all Address sub-resources for a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function listPatientAddressesUseCase(patientId: number) {
  return getInjection("IPatientsService").listAddresses(patientId);
}
