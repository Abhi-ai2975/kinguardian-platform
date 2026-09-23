/**
 * deletePatientPhotoUseCase — removes a specific Photo sub-resource from a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function deletePatientPhotoUseCase(patientId: number, itemId: number): Promise<void> {
  return getInjection("IPatientsService").deletePhoto(patientId, itemId);
}
