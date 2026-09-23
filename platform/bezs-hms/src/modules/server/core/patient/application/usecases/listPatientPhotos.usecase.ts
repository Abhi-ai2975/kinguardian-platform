/**
 * listPatientPhotosUseCase — lists all Photo sub-resources for a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function listPatientPhotosUseCase(patientId: number) {
  return getInjection("IPatientsService").listPhotos(patientId);
}
