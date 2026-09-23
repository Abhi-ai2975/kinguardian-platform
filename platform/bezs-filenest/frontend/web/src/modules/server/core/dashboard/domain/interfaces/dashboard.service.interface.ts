/**
 * dashboard.service.interface — contract for the dashboard service.
 *
 * @module
 */
import type { TDashboardResponse } from "@/modules/entities/schemas/dashboard";

export interface IDashboardService {
  get(): Promise<TDashboardResponse>;
}
