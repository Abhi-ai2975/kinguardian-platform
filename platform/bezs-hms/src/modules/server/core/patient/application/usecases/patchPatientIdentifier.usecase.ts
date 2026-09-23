/**
 * patchPatientIdentifierUseCase — updates a specific Identifier sub-resource on a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TPatchPatientIdentifier, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function patchPatientIdentifierUseCase(patientId: number, itemId: number, dto: TPatchPatientIdentifier): Promise<TPatientResponse> {
  return getInjection("IPatientsService").patchIdentifier(patientId, itemId, dto);
}
