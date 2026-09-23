/**
 * getDashboard.usecase — returns the full dashboard payload for the active org.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TDashboardResponse } from "@/modules/entities/schemas/dashboard";

export async function getDashboardUseCase(): Promise<TDashboardResponse> {
  return getInjection("IDashboardService").get();
}
