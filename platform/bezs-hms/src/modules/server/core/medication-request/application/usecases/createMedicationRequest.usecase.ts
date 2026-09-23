/**
 * createMedicationRequest use case.
 *
 * Layer: server / core / medication-request / application / usecases
 *
 * Resolves IMedicationRequestService from DI and delegates the create call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TCreateMedicationRequest,
  type TMedicationRequestResponse,
} from "@/modules/entities/schemas/medication-request";

/**
 * Creates a new MedicationRequest via the transport-agnostic IMedicationRequestService.
 *
 * @param dto - Validated create payload (status + intent required).
 * @returns The created MedicationRequest resource.
 */
export async function createMedicationRequestUseCase(
  dto: TCreateMedicationRequest,
): Promise<TMedicationRequestResponse> {
  const service = getInjection("IMedicationRequestService");
  return service.create(dto);
}
