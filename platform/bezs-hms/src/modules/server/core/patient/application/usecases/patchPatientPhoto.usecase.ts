/**
 * patchPatientPhotoUseCase — updates a specific Photo sub-resource on a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type {
  TPatchPatientPhoto,
  TPatientResponse,
} from "@/modules/entities/schemas/patient";

export async function patchPatientPhotoUseCase(
  patientId: number,
  itemId: number,
  dto: TPatchPatientPhoto,
): Promise<TPatientResponse> {
  return getInjection("IPatientsService").patchPhoto(patientId, itemId, dto);
}
