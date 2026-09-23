/**
 * @module admin/apikeys.repository
 * @description Prisma-direct operations for API keys — list (admin view) and
 *              delete. Key generation/hashing and permission/metadata updates
 *              go through Better Auth's `auth.api` in `ApiKeyService` instead.
 * @category Infrastructure
 * @layer Infrastructure
 */

import { randomUUID } from "crypto";
import { prisma } from "../../../../../../../prisma/db";
import { IApiKeyRepository } from "../../domain/interfaces/repositories/apikeys.repository.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { InfrastructureError } from "@/modules/server/shared/errors/infrastructureError";
import {
  ApiKeySchema,
  ListApiKeysResponseSchema,
  TListApiKeysResponseSchema,
  TListApiKeysQuerySchema,
  TDeleteApiKeyValidationSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";

export class ApiKeyRepository implements IApiKeyRepository {
  // ---------------------------------------------------------------- //
  // LIST — Prisma direct (no session needed for admin view)
  // ---------------------------------------------------------------- //
  async listApiKeys(
    query: TListApiKeysQuerySchema,
  ): Promise<TListApiKeysResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "ApiKeyRepository.listApiKeys",
      startTimeMs,
      context: { operationId, ...query },
    });
    try {
      const where = {
        ...(query.userId && { referenceId: query.userId }),
        ...(query.organizationId && { referenceId: query.organizationId }),
        ...(query.configId && { configId: query.configId }),
      };

      const [rows, total] = await Promise.all([
        prisma.apikey.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: query.limit,
          skip: query.offset,
        }),
        prisma.apikey.count({ where }),
      ]);

      const apiKeys = rows.map((k) => ApiKeySchema.parse(k));
      const data = ListApiKeysResponseSchema.parse({ apiKeys, total });

      logOperation("success", {
        name: "ApiKeyRepository.listApiKeys",
        startTimeMs,
        data: { count: data.apiKeys.length, total: data.total },
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "ApiKeyRepository.listApiKeys",
        startTimeMs,
        err: error,
        context: { operationId },
      });
      throw new InfrastructureError("Failed to list API keys", error);
    }
  }

  // ---------------------------------------------------------------- //
  // DELETE — Prisma direct
  // ---------------------------------------------------------------- //
  async deleteApiKey(
    payload: TDeleteApiKeyValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "ApiKeyRepository.deleteApiKey",
      startTimeMs,
      context: { operationId, keyId: payload.keyId },
    });
    try {
      await prisma.apikey.delete({ where: { id: payload.keyId } });

      logOperation("success", {
        name: "ApiKeyRepository.deleteApiKey",
        startTimeMs,
        context: { operationId },
      });
      return { success: true };
    } catch (error) {
      logOperation("error", {
        name: "ApiKeyRepository.deleteApiKey",
        startTimeMs,
        err: error,
        context: { operationId },
      });
      throw new InfrastructureError("Failed to delete API key", error);
    }
  }
}
