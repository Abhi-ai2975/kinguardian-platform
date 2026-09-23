/**
 * abandonIntake use case.
 *
 * Layer: server / core / intake / application
 *
 * Marks an in-progress intake session as ABANDONED.
 * Called when the patient navigates away without completing the intake.
 */

import { getInjection } from "@/modules/server/di/container";
import type { TAbandonIntake, TIntakeResponse } from "@/modules/entities/schemas/intake";

/**
 * @param dto - id of the intake to abandon.
 * @returns Updated Intake record with status ABANDONED.
 */
export async function abandonIntakeUseCase(dto: TAbandonIntake): Promise<TIntakeResponse> {
  const repo = getInjection("IIntakeRepository");
  return repo.abandonIntake(dto);
}
