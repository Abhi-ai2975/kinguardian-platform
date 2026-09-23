/**
 * createIntake use case.
 *
 * Layer: server / core / intake / application
 *
 * Creates a new IN_PROGRESS intake session for the authenticated patient.
 */

import { getInjection } from "@/modules/server/di/container";
import type { TCreateIntake, TIntakeResponse } from "@/modules/entities/schemas/intake";

/**
 * Delegates intake creation to the injected IntakePrismaRepository.
 *
 * @param dto - userId, org_id, optional patient_fhir_id, mode.
 * @returns The created Intake record.
 */
export async function createIntakeUseCase(dto: TCreateIntake): Promise<TIntakeResponse> {
  const repo = getInjection("IIntakeRepository");
  return repo.createIntake(dto);
}
