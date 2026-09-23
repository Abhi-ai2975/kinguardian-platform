/**
 * deletePatientAddressUseCase — removes a specific Address sub-resource from a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function deletePatientAddressUseCase(patientId: number, itemId: number): Promise<void> {
  return getInjection("IPatientsService").deleteAddress(patientId, itemId);
}
