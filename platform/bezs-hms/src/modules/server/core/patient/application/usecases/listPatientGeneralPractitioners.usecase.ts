/**
 * listPatientGeneralPractitionersUseCase — lists all generalPractitioner references for a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function listPatientGeneralPractitionersUseCase(patientId: number) {
  return getInjection("IPatientsService").listGeneralPractitioners(patientId);
}
