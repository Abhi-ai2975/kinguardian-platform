/**
 * addPatientLinkUseCase — adds a link to another Patient or RelatedPerson.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TAddPatientLink, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function addPatientLinkUseCase(patientId: number, dto: TAddPatientLink): Promise<TPatientResponse> {
  return getInjection("IPatientsService").addLink(patientId, dto);
}
