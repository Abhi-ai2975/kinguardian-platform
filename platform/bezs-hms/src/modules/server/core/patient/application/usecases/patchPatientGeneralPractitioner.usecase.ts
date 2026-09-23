/**
 * patchPatientGeneralPractitionerUseCase — updates a specific generalPractitioner reference on a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TPatchPatientGP, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function patchPatientGeneralPractitionerUseCase(patientId: number, itemId: number, dto: TPatchPatientGP): Promise<TPatientResponse> {
  return getInjection("IPatientsService").patchGeneralPractitioner(patientId, itemId, dto);
}
