/**
 * addPatientAddressUseCase — adds a Address sub-resource to a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TAddPatientAddress, TPatientResponse } from "@/modules/entities/schemas/patient";

export async function addPatientAddressUseCase(patientId: number, dto: TAddPatientAddress): Promise<TPatientResponse> {
  return getInjection("IPatientsService").addAddress(patientId, dto);
}
