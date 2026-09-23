/**
 * getIntakeById use case.
 *
 * Layer: server / core / intake / application
 */

import { getInjection } from "@/modules/server/di/container";
import type { TIntakeResponse } from "@/modules/entities/schemas/intake";

/**
 * @param id - Local Intake.id.
 * @returns The Intake record.
 * @throws NotFoundError if not found.
 */
export async function getIntakeByIdUseCase(id: number): Promise<TIntakeResponse> {
  const repo = getInjection("IIntakeRepository");
  return repo.getById(id);
}
