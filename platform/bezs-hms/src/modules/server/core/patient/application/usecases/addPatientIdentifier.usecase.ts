/**
 * addPatientIdentifierUseCase — adds a Identifier sub-resource to a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TAddPatientIdentifier, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function addPatientIdentifierUseCase(patientId: number, dto: TAddPatientIdentifier): Promise<TPatientResponse> {
  return getInjection("IPatientsService").addIdentifier(patientId, dto);
}
