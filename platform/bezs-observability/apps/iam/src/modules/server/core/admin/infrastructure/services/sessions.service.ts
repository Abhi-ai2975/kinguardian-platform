import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { auth } from "@/modules/server/auth-provider/auth";
import { prisma } from "../../../../../../../prisma/db";
import { ISessionsService } from "../../domain/interfaces/sessions.service.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { mapBetterAuthError } from "@/modules/server/shared/errors/mappers/mapBetterAuthError";
import {
  GetAllSessionsResponseDtoSchema,
  TGetAllSessionsResponseDtoSchema,
  TRevokeSessionValidationSchema,
} from "@/modules/entities/schemas/admin/sessions/sessions.schema";

export class SessionsService implements ISessionsService {
  async getAllSessions(): Promise<TGetAllSessionsResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "SessionsService.getAllSessions", startTimeMs, context: { operationId } });
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
      logOperation("success", { name: "SessionsService.getAllSessions", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "SessionsService.getAllSessions", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to get all sessions");
    }
  }

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

  async revokeAllSessions(): Promise<{ success: boolean; count: number }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "SessionsService.revokeAllSessions", startTimeMs, context: { operationId } });
    try {
      const result = await prisma.session.deleteMany({});
      const data = { success: true, count: result.count };
      logOperation("success", { name: "SessionsService.revokeAllSessions", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "SessionsService.revokeAllSessions", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to revoke all sessions");
    }
  }
}
