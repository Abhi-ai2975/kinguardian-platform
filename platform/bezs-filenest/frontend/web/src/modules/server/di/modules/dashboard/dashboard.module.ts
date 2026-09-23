/**
 * dashboard.module — DI registration for the dashboard domain.
 *
 * @module
 */
import type { Container } from "@evyweb/ioctopus";
import { DashboardRestService } from "@/modules/server/core/dashboard/infrastructure/services/dashboard.rest.service";
import { DI_SYMBOLS } from "../../types";

export function registerDashboardModule(container: Container): void {
  container.bind(DI_SYMBOLS.IDashboardService).toClass(DashboardRestService);
}
