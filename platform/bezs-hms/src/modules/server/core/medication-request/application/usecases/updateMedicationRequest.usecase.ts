/**
 * updateMedicationRequest use case.
 *
 * Layer: server / core / medication-request / application / usecases
 *
 * Resolves IMedicationRequestService from DI and delegates the patch call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TUpdateMedicationRequestDto,
  type TMedicationRequestResponse,
} from "@/modules/entities/schemas/medication-request";

/**
 * Patches scalar fields on an existing MedicationRequest.
 *
 * @param id - fhir-gql database ID of the resource to update.
 * @param dto - Scalar patch payload (all fields optional).
 * @returns The updated MedicationRequest resource.
 */
export async function updateMedicationRequestUseCase(
  id: number,
  dto: TUpdateMedicationRequestDto,
): Promise<TMedicationRequestResponse> {
  const service = getInjection("IMedicationRequestService");
  return service.update(id, dto);
}
