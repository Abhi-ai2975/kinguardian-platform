/**
 * @module admin/preferenceTemplates.repository
 * @description Manages locale/format preference templates used to set default
 *              date, time, currency, and number formats for users.
 *              Enforces the "only one GLOBAL template" business rule.
 *              All operations use Prisma directly.
 * @category Infrastructure
 * @layer Infrastructure
 */

import { randomUUID } from "crypto";
import { prisma } from "../../../../../../../prisma/db";
import { IPreferenceTemplatesRepository } from "../../domain/interfaces/repositories/preferenceTemplates.repository.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { InfrastructureError } from "@/modules/server/shared/errors/infrastructureError";
import { ApplicationError } from "@/modules/server/shared/errors/applicationError";
import {
  TPreferenceTemplateSchema,
  TListPreferenceTemplatesResponseSchema,
  TCreatePreferenceTemplateValidationSchema,
  TUpdatePreferenceTemplateValidationSchema,
  TDeletePreferenceTemplateValidationSchema,
  PreferenceTemplateSchema,
  ListPreferenceTemplatesResponseSchema,
} from "@/modules/entities/schemas/admin/preference-templates/preference-template.schema";

export class PreferenceTemplatesRepository implements IPreferenceTemplatesRepository {
  async listPreferenceTemplates(): Promise<TListPreferenceTemplatesResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PreferenceTemplatesRepository.listPreferenceTemplates",
      startTimeMs,
      context: { operationId },
    });

    try {
      const [rows, total] = await prisma.$transaction([
        prisma.preferenceTemplate.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.preferenceTemplate.count(),
      ]);

      const data = await ListPreferenceTemplatesResponseSchema.parseAsync({
        templates: rows,
        total,
      });

      logOperation("success", {
        name: "PreferenceTemplatesRepository.listPreferenceTemplates",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "PreferenceTemplatesRepository.listPreferenceTemplates",
        startTimeMs,
        err: error,
        context: { operationId },
      });
      throw new InfrastructureError(
        "Failed to list preference templates",
        error,
      );
    }
  }

  async createPreferenceTemplate(
    payload: TCreatePreferenceTemplateValidationSchema,
  ): Promise<TPreferenceTemplateSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PreferenceTemplatesRepository.createPreferenceTemplate",
      startTimeMs,
      context: { operationId, scope: payload.scope },
    });

    try {
      // Only one GLOBAL template allowed
      if (payload.scope === "GLOBAL") {
        const existing = await prisma.preferenceTemplate.findFirst({
          where: { scope: "GLOBAL" },
        });
        if (existing) {
          throw new ApplicationError(
            "A Global preference template already exists. Only one is allowed.",
          );
        }
      }

      const row = await prisma.preferenceTemplate.create({
        data: {
          id: randomUUID(),
          scope: payload.scope,
          country: payload.country ?? null,
          timezone: payload.timezone,
          dateFormat: payload.dateFormat,
          timeFormat: payload.timeFormat,
          currency: payload.currency,
          numberFormat: payload.numberFormat,
          weekStart: payload.weekStart,
        },
      });

      const data = await PreferenceTemplateSchema.parseAsync(row);

      logOperation("success", {
        name: "PreferenceTemplatesRepository.createPreferenceTemplate",
        startTimeMs,
        data,
        context: { operationId },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "PreferenceTemplatesRepository.createPreferenceTemplate",
        startTimeMs,
        err: error,
        context: { operationId },
      });
      if (error instanceof ApplicationError) throw error;
      throw new InfrastructureError(
        "Failed to create preference template",
        error,
      );
    }
  }

  async updatePreferenceTemplate(
    payload: TUpdatePreferenceTemplateValidationSchema,
  ): Promise<TPreferenceTemplateSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    const { id, ...fields } = payload;

    logOperation("start", {
      name: "PreferenceTemplatesRepository.updatePreferenceTemplate",
      startTimeMs,
      context: { operationId, id },
    });

    try {
      // If changing to GLOBAL, ensure no other GLOBAL exists
      if (fields.scope === "GLOBAL") {
        const existing = await prisma.preferenceTemplate.findFirst({
          where: { scope: "GLOBAL", NOT: { id } },
        });
        if (existing) {
          throw new ApplicationError(
            "A Global preference template already exists. Only one is allowed.",
          );
        }
      }

      const row = await prisma.preferenceTemplate.update({
        where: { id },
        data: {
          scope: fields.scope,
          country: fields.country ?? null,
          timezone: fields.timezone,
          dateFormat: fields.dateFormat,
          timeFormat: fields.timeFormat,
          currency: fields.currency,
          numberFormat: fields.numberFormat,
          weekStart: fields.weekStart,
        },
      });

      const data = await PreferenceTemplateSchema.parseAsync(row);

      logOperation("success", {
        name: "PreferenceTemplatesRepository.updatePreferenceTemplate",
        startTimeMs,
        data,
        context: { operationId, id },
      });

      return data;
    } catch (error) {
      logOperation("error", {
        name: "PreferenceTemplatesRepository.updatePreferenceTemplate",
        startTimeMs,
        err: error,
        context: { operationId, id },
      });
      if (error instanceof ApplicationError) throw error;
      throw new InfrastructureError(
        "Failed to update preference template",
        error,
      );
    }
  }

  async deletePreferenceTemplate(
    payload: TDeletePreferenceTemplateValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();

    logOperation("start", {
      name: "PreferenceTemplatesRepository.deletePreferenceTemplate",
      startTimeMs,
      context: { operationId, id: payload.id },
    });

    try {
      await prisma.preferenceTemplate.delete({ where: { id: payload.id } });

      logOperation("success", {
        name: "PreferenceTemplatesRepository.deletePreferenceTemplate",
        startTimeMs,
        data: { success: true },
        context: { operationId, id: payload.id },
      });

      return { success: true };
    } catch (error) {
      logOperation("error", {
        name: "PreferenceTemplatesRepository.deletePreferenceTemplate",
        startTimeMs,
        err: error,
        context: { operationId, id: payload.id },
      });
      throw new InfrastructureError(
        "Failed to delete preference template",
        error,
      );
    }
  }
}
