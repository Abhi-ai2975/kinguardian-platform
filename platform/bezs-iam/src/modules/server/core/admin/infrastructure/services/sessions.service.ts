/**
 * @module admin/sessions.service
 * @description Session revocation via Better Auth's `auth.api.revokeUserSession`.
 *              Prisma-only operations (list, revoke-all) live in
 *              `SessionsRepository` instead.
 * @category Infrastructure
 * @layer Infrastructure
 */

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { auth } from "@/modules/server/auth-provider/auth";
import { ISessionsService } from "../../domain/interfaces/services/sessions.service.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { mapBetterAuthError } from "@/modules/server/shared/errors/mappers/mapBetterAuthError";
import {
  TRevokeSessionValidationSchema,
} from "@/modules/entities/schemas/admin/sessions/sessions.schema";

export class SessionsService implements ISessionsService {
  /**
   * Revoke a single session by its token.
   * Calls `auth.api.revokeUserSession` — the user is signed out from that specific device.
   */
  async revokeUserSession(
    payload: TRevokeSessionValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "SessionsService.revokeUserSession", startTimeMs, context: { operationId } });
    try {
      const res = await auth.api.revokeUserSession({
        body: { sessionToken: payload.sessionToken },
        headers: await headers(),
      });
      const data = { success: res.success };
      logOperation("success", { name: "SessionsService.revokeUserSession", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "SessionsService.revokeUserSession", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to revoke user session");
    }
  }
}
