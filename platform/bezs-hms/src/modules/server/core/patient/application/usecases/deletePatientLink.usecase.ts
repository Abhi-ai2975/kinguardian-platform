/**
 * deletePatientLinkUseCase — removes a specific link from a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function deletePatientLinkUseCase(patientId: number, itemId: number): Promise<void> {
  return getInjection("IPatientsService").deleteLink(patientId, itemId);
}
