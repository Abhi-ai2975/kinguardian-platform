/**
 * patchPatientContactUseCase — updates a specific Contact sub-resource on a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TPatchPatientContact, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function patchPatientContactUseCase(patientId: number, itemId: number, dto: TPatchPatientContact): Promise<TPatientResponse> {
  return getInjection("IPatientsService").patchContact(patientId, itemId, dto);
}
