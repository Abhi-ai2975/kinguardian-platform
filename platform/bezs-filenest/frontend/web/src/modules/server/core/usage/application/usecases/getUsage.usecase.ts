/**
 * getUsage.usecase — retrieves org usage stats and per-project breakdown.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TUsageResponse } from "@/modules/entities/schemas/usage";

export async function getUsageUseCase(): Promise<TUsageResponse> {
  const service = getInjection("IUsageService");
  return service.get();
}
