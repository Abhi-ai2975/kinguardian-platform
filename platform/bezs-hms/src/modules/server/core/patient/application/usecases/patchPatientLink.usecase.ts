/**
 * patchPatientLinkUseCase — updates a specific link on a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TPatchPatientLink, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function patchPatientLinkUseCase(patientId: number, itemId: number, dto: TPatchPatientLink): Promise<TPatientResponse> {
  return getInjection("IPatientsService").patchLink(patientId, itemId, dto);
}
