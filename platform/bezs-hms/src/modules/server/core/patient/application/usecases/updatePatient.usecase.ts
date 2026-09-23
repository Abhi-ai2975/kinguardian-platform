/**
 * updatePatientUseCase — partially updates scalar fields on a Patient.
 * Layer: application / use cases
 */
import { getInjection } from "@/modules/server/di/container";
import type { TUpdatePatientDto, TPatientResponse } from "@/modules/entities/schemas/patient";

/**
 * @param id  - The Patient primary key.
 * @param dto - Patchable fields.
 * @returns The updated Patient record.
 */
export async function updatePatientUseCase(id: number, dto: TUpdatePatientDto): Promise<TPatientResponse> {
  return getInjection("IPatientsService").update(id, dto);
}
