/**
 * updateIntake use case.
 *
 * Layer: server / core / intake / application
 *
 * Saves the completed intake conversation and AI report, marking status COMPLETED.
 */

import { getInjection } from "@/modules/server/di/container";
import type { TUpdateIntake, TIntakeResponse } from "@/modules/entities/schemas/intake";

/**
 * @param dto - id, conversation, optional report.
 * @returns Updated Intake record.
 */
export async function updateIntakeUseCase(dto: TUpdateIntake): Promise<TIntakeResponse> {
  const repo = getInjection("IIntakeRepository");
  return repo.updateIntake(dto);
}
