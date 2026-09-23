/**
 * addPatientGeneralPractitionerUseCase — adds a generalPractitioner reference to a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TAddPatientGP, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function addPatientGeneralPractitionerUseCase(patientId: number, dto: TAddPatientGP): Promise<TPatientResponse> {
  return getInjection("IPatientsService").addGeneralPractitioner(patientId, dto);
}
