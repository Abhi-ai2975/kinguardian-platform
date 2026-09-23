/**
 * deletePatientIdentifierUseCase — removes a specific Identifier sub-resource from a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function deletePatientIdentifierUseCase(patientId: number, itemId: number): Promise<void> {
  return getInjection("IPatientsService").deleteIdentifier(patientId, itemId);
}
