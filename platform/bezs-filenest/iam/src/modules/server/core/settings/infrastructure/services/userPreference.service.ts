/**
 * @module settings/userPreference.service
 * @description Manages per-user locale/format preferences (date format, time format,
 *              currency, number format, week start). Uses Prisma upsert for
 *              create-on-first-access pattern. Returns null when no preference exists.
 * @category Infrastructure
 * @layer Infrastructure
 */

import { randomUUID } from "crypto";
import { prisma } from "../../../../../../../prisma/db";
import { IUserPreferenceService } from "../../domain/interfaces/userPreference.service.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { InfrastructureError } from "@/modules/server/shared/errors/infrastructureError";
import {
  TUserPreferenceSchema,
  TUpdateUserPreferenceValidationSchema,
  UserPreferenceSchema,
} from "@/modules/entities/schemas/settings/preference/preference.schema";

export class UserPreferenceService implements IUserPreferenceService {
  async getUserPreference(
    userId: string,
  ): Promise<TUserPreferenceSchema | null> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "UserPreferenceService.getUserPreference",
      startTimeMs,
      context: { operationId, userId },
    });

    try {
      const row = await prisma.userPreference.findUnique({
        where: { userId },
      });

      if (!row) {
        logOperation("success", {
          name: "UserPreferenceService.getUserPreference",
          startTimeMs,
          data: null,
          context: { operationId, userId, note: "no record found" },
        });
        return null;
      }

      const data = await UserPreferenceSchema.parseAsync(row);

      logOperation("success", {
        name: "UserPreferenceService.getUserPreference",
        startTimeMs,
        data,
        context: { operationId, userId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "UserPreferenceService.getUserPreference",
        startTimeMs,
        err: error,
        context: { operationId, userId },
      });
      throw new InfrastructureError("Failed to get user preference", error);
    }
  }

  async upsertUserPreference(
    payload: TUpdateUserPreferenceValidationSchema,
  ): Promise<TUserPreferenceSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    const { userId, ...fields } = payload;

    logOperation("start", {
      name: "UserPreferenceService.upsertUserPreference",
      startTimeMs,
      context: { operationId, userId },
    });

    try {
      const row = await prisma.userPreference.upsert({
        where: { userId },
        update: { ...fields },
        create: {
          id: randomUUID(),
          userId,
          ...fields,
        },
      });

      const data = await UserPreferenceSchema.parseAsync(row);

      logOperation("success", {
        name: "UserPreferenceService.upsertUserPreference",
        startTimeMs,
        data,
        context: { operationId, userId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "UserPreferenceService.upsertUserPreference",
        startTimeMs,
        err: error,
        context: { operationId, userId },
      });
      throw new InfrastructureError("Failed to update user preference", error);
    }
  }
}
