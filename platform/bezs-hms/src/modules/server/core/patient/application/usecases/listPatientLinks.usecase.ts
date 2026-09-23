/**
 * listPatientLinksUseCase — lists all links for a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";

export async function listPatientLinksUseCase(patientId: number) {
  return getInjection("IPatientsService").listLinks(patientId);
}
