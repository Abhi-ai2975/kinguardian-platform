/**
 * dashboard.rest.service — fetches dashboard data from the FileNest backend.
 *
 * Calls GET /v1/dashboard. The org ID is carried by the Bearer token —
 * no explicit parameter needed.
 *
 * @module
 */
"server-only";

import { filenestApi } from "@/modules/server/utils/api-client";
import { DashboardResponseSchema, type TDashboardResponse } from "@/modules/entities/schemas/dashboard";
import { OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import type { IDashboardService } from "../../domain/interfaces/dashboard.service.interface";

export class DashboardRestService implements IDashboardService {
  async get(): Promise<TDashboardResponse> {
    const raw = await filenestApi<unknown>("/v1/dashboard");
    const parsed = DashboardResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }
}
