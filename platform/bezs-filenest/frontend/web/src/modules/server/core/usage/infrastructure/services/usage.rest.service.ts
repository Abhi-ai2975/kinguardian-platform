/**
 * usage.rest.service — fetches usage data from the FileNest backend.
 *
 * Calls GET /v1/usage. The org ID is carried by the Bearer token —
 * no explicit parameter needed.
 *
 * @module
 */
"server-only";

import { filenestApi } from "@/modules/server/utils/api-client";
import { UsageResponseSchema, type TUsageResponse } from "@/modules/entities/schemas/usage";
import { OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import type { IUsageService } from "../../domain/interfaces/usage.service.interface";

export class UsageRestService implements IUsageService {
  async get(): Promise<TUsageResponse> {
    const raw = await filenestApi<unknown>("/v1/usage");
    const parsed = UsageResponseSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }
}
