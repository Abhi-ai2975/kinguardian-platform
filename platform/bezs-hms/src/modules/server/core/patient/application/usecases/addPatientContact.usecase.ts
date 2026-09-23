/**
 * addPatientContactUseCase — adds a Contact sub-resource to a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TAddPatientContact, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function addPatientContactUseCase(patientId: number, dto: TAddPatientContact): Promise<TPatientResponse> {
  return getInjection("IPatientsService").addContact(patientId, dto);
}
