/**
 * getDashboard.controller — validates input and returns dashboard data.
 *
 * Input is an empty object (no parameters required — org is from auth token).
 *
 * @module
 */
"server-only";

import { getDashboardUseCase } from "../../application/usecases/getDashboard.usecase";
import type { TDashboardResponse } from "@/modules/entities/schemas/dashboard";

function presenter(data: TDashboardResponse): TDashboardResponse {
  return data;
}

export type TGetDashboardControllerOutput = ReturnType<typeof presenter>;

export async function getDashboardController(): Promise<TGetDashboardControllerOutput> {
  return presenter(await getDashboardUseCase());
}
