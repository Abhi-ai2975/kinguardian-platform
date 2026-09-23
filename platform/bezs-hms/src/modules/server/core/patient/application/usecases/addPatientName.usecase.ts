/**
 * addPatientNameUseCase — adds a Name sub-resource to a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TAddPatientName, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function addPatientNameUseCase(patientId: number, dto: TAddPatientName): Promise<TPatientResponse> {
  return getInjection("IPatientsService").addName(patientId, dto);
}
