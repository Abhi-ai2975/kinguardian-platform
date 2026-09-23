/**
 * getUsage.controller — returns org usage data.
 *
 * No input parameters required — org is resolved from the auth token.
 *
 * @module
 */
"server-only";

import { getUsageUseCase } from "../../application/usecases/getUsage.usecase";
import type { TUsageResponse } from "@/modules/entities/schemas/usage";

function presenter(data: TUsageResponse): TUsageResponse {
  return data;
}

export type TGetUsageControllerOutput = ReturnType<typeof presenter>;

export async function getUsageController(): Promise<TGetUsageControllerOutput> {
  return presenter(await getUsageUseCase());
}
