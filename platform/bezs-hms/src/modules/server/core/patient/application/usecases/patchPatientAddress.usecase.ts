/**
 * patchPatientAddressUseCase — updates a specific Address sub-resource on a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TPatchPatientAddress, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function patchPatientAddressUseCase(patientId: number, itemId: number, dto: TPatchPatientAddress): Promise<TPatientResponse> {
  return getInjection("IPatientsService").patchAddress(patientId, itemId, dto);
}
