/**
 * @module admin/apikeys.service
 * @description Manages API keys (prefix: `drgodly_`) via Better Auth's `auth.api`
 *              — needed for proper key generation/hashing and permission/metadata
 *              changes. Prisma-only operations (list/delete) live in
 *              `ApiKeyRepository` instead.
 *              Admin calls omit session headers — they are trusted server operations.
 * @category Infrastructure
 * @layer Infrastructure
 */

import { randomUUID } from "crypto";
import { auth } from "@/modules/server/auth-provider/auth";
import { IApiKeyService } from "../../domain/interfaces/services/apikeys.service.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { mapBetterAuthError } from "@/modules/server/shared/errors/mappers/mapBetterAuthError";
import {
  ApiKeySchema,
  ApiKeyCreatedSchema,
  TApiKeySchema,
  TApiKeyCreatedSchema,
  TCreateApiKeyValidationSchema,
  TUpdateApiKeyValidationSchema,
  TDeleteExpiredApiKeysValidationSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

export class ApiKeyService implements IApiKeyService {
  // ---------------------------------------------------------------- //
  // CREATE — auth.api (needed to generate + hash the raw key)
  // No headers = trusted server call; allows server-only props like userId
  // ---------------------------------------------------------------- //
  async createApiKey(
    payload: TCreateApiKeyValidationSchema,
  ): Promise<TApiKeyCreatedSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "ApiKeyService.createApiKey",
      startTimeMs,
      context: { operationId, name: payload.name },
    });
    try {
      const res = await auth.api.createApiKey({
        body: {
          name: payload.name,
          userId: payload.userId,
          organizationId: payload.organizationId,
          configId: payload.configId,
          prefix: payload.prefix,
          expiresIn: payload.expiresIn ?? undefined,
          remaining: payload.remaining ?? undefined,
          refillAmount: payload.refillAmount ?? undefined,
          refillInterval: payload.refillInterval ?? undefined,
          rateLimitEnabled: payload.rateLimitEnabled,
          rateLimitTimeWindow: payload.rateLimitTimeWindow ?? undefined,
          rateLimitMax: payload.rateLimitMax ?? undefined,
          permissions: payload.permissions
            ? (JSON.parse(payload.permissions) as Record<string, string[]>)
            : undefined,
          metadata: payload.metadata
            ? (JSON.parse(payload.metadata) as Record<string, unknown>)
            : undefined,
        },
      });

      const data = ApiKeyCreatedSchema.parse(res);

      logOperation("success", {
        name: "ApiKeyService.createApiKey",
        startTimeMs,
        data: { id: data.id },
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "ApiKeyService.createApiKey",
        startTimeMs,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to create API key");
    }
  }

  // ---------------------------------------------------------------- //
  // UPDATE — auth.api (server-side, no headers, userId in body)
  // ---------------------------------------------------------------- //
  async updateApiKey(
    payload: TUpdateApiKeyValidationSchema,
  ): Promise<TApiKeySchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "ApiKeyService.updateApiKey",
      startTimeMs,
      context: { operationId, keyId: payload.keyId },
    });
    try {
      const res = await auth.api.updateApiKey({
        body: {
          keyId: payload.keyId,
          name: payload.name ?? undefined,
          enabled: payload.enabled ?? undefined,
          expiresIn: payload.expiresIn ?? undefined,
          remaining: payload.remaining ?? undefined,
          refillAmount: payload.refillAmount ?? undefined,
          refillInterval: payload.refillInterval ?? undefined,
          rateLimitEnabled: payload.rateLimitEnabled ?? undefined,
          rateLimitMax: payload.rateLimitMax ?? undefined,
          rateLimitTimeWindow: payload.rateLimitTimeWindow ?? undefined,
          permissions: payload.permissions
            ? (JSON.parse(payload.permissions) as Record<string, string[]>)
            : undefined,
          metadata: payload.metadata
            ? (JSON.parse(payload.metadata) as Record<string, unknown>)
            : undefined,
        },
      });

      const data = ApiKeySchema.parse(res);

      logOperation("success", {
        name: "ApiKeyService.updateApiKey",
        startTimeMs,
        data: { id: data.id },
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "ApiKeyService.updateApiKey",
        startTimeMs,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to update API key");
    }
  }

  // ---------------------------------------------------------------- //
  // DELETE EXPIRED — auth.api (server-only, no session needed)
  // ---------------------------------------------------------------- //
  async deleteExpiredApiKeys(
    payload: TDeleteExpiredApiKeysValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "ApiKeyService.deleteExpiredApiKeys",
      startTimeMs,
      context: { operationId },
    });
    try {
      await auth.api.deleteAllExpiredApiKeys({
        body: {
          ...(payload.configId && { configId: payload.configId }),
        },
      });

      logOperation("success", {
        name: "ApiKeyService.deleteExpiredApiKeys",
        startTimeMs,
        context: { operationId },
      });
      return { success: true };
    } catch (error) {
      logOperation("error", {
        name: "ApiKeyService.deleteExpiredApiKeys",
        startTimeMs,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to delete expired API keys");
    }
  }
}
