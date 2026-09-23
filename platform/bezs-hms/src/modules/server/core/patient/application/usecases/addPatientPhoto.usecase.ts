/**
 * addPatientPhotoUseCase — adds a Photo sub-resource to a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type {
  TAddPatientPhoto,
  TPatientResponse,
} from "@/modules/entities/schemas/patient";

export async function addPatientPhotoUseCase(
  patientId: number,
  dto: TAddPatientPhoto,
): Promise<TPatientResponse> {
  return getInjection("IPatientsService").addPhoto(patientId, dto);
}
