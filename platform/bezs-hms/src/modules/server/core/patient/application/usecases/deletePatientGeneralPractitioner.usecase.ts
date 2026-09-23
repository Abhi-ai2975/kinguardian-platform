/**
 * deletePatientGeneralPractitionerUseCase — removes a specific generalPractitioner reference from a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function deletePatientGeneralPractitionerUseCase(patientId: number, itemId: number): Promise<void> {
  return getInjection("IPatientsService").deleteGeneralPractitioner(patientId, itemId);
}
