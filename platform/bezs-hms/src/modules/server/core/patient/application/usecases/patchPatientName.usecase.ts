/**
 * patchPatientNameUseCase — updates a specific Name sub-resource on a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TPatchPatientName, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function patchPatientNameUseCase(patientId: number, itemId: number, dto: TPatchPatientName): Promise<TPatientResponse> {
  return getInjection("IPatientsService").patchName(patientId, itemId, dto);
}
