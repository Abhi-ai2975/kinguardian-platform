/**
 * patchPatientTelecomUseCase — updates a specific Telecom sub-resource on a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TPatchPatientTelecom, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function patchPatientTelecomUseCase(patientId: number, itemId: number, dto: TPatchPatientTelecom): Promise<TPatientResponse> {
  return getInjection("IPatientsService").patchTelecom(patientId, itemId, dto);
}
