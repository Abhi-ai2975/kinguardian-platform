/**
 * createPatientUseCase — creates a new Patient resource.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TCreatePatient } from "@/modules/entities/schemas/patient";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

/**
 * @param dto - Validated create payload.
 * @returns The newly created Patient record.
 */
export async function createPatientUseCase(dto: TCreatePatient): Promise<TPatientResponse> {
  return getInjection("IPatientsService").create(dto);
}
