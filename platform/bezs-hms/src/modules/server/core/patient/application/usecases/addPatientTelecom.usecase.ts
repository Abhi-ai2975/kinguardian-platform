/**
 * addPatientTelecomUseCase — adds a Telecom sub-resource to a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TAddPatientTelecom, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function addPatientTelecomUseCase(patientId: number, dto: TAddPatientTelecom): Promise<TPatientResponse> {
  return getInjection("IPatientsService").addTelecom(patientId, dto);
}
