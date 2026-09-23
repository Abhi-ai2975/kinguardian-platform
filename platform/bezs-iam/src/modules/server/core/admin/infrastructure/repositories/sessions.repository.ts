/**
 * @module admin/sessions.repository
 * @description Prisma-direct session operations.
 *              - List all sessions: queries Prisma directly for rich user info.
 *              - Revoke all sessions: `prisma.session.deleteMany()` (destructive).
 *              Single-session revocation goes through Better Auth's `auth.api`
 *              in `SessionsService` instead.
 * @category Infrastructure
 * @layer Infrastructure
 */

import { randomUUID } from "crypto";
import { prisma } from "../../../../../../../prisma/db";
import { ISessionsRepository } from "../../domain/interfaces/repositories/sessions.repository.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { mapBetterAuthError } from "@/modules/server/shared/errors/mappers/mapBetterAuthError";
import {
  GetAllSessionsResponseDtoSchema,
  TGetAllSessionsResponseDtoSchema,
} from "@/modules/entities/schemas/admin/sessions/sessions.schema";

export class SessionsRepository implements ISessionsRepository {
  /**
   * List all sessions with user info (name, email, role).
   * Uses Prisma directly (not Better Auth API) to get enriched user data
   * including roles. Ordered by creation date descending.
   */
  async getAllSessions(): Promise<TGetAllSessionsResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "SessionsRepository.getAllSessions", startTimeMs, context: { operationId } });
    try {
      const sessions = await prisma.session.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      const data = await GetAllSessionsResponseDtoSchema.parseAsync({ sessions });
      logOperation("success", { name: "SessionsRepository.getAllSessions", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "SessionsRepository.getAllSessions", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to get all sessions");
    }
  }

  /**
   * ⚠️ **Destructive:** Delete ALL sessions in the database.
   * Forces every user to re-authenticate. Returns the count of deleted sessions.
   */
  async revokeAllSessions(): Promise<{ success: boolean; count: number }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "SessionsRepository.revokeAllSessions", startTimeMs, context: { operationId } });
    try {
      const result = await prisma.session.deleteMany({});
      const data = { success: true, count: result.count };
      logOperation("success", { name: "SessionsRepository.revokeAllSessions", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "SessionsRepository.revokeAllSessions", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to revoke all sessions");
    }
  }
}
