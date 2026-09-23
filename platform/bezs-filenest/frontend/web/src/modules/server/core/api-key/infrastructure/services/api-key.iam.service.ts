/**
 * api-key.iam.service — IAM implementation of IApiKeyService.
 *
 * Layer: core / api-key / infrastructure / services
 *
 * Calls the BetterAuth IAM REST API via iamApi. All key management
 * (create / list / revoke) lives in the IAM — the FileNest backend
 * validates keys but does not manage them.
 *
 * Bound in the DI container by registerApiKeyModule().
 *
 * @module
 */
"server-only";

import { iamApi } from "@/modules/server/utils/iam-api-client";
import {
  ApiKeyListSchema,
  CreatedApiKeySchema,
  type TApiKeyList,
  type TCreatedApiKey,
  type TCreateApiKey,
  type TListApiKeys,
  type TRevokeApiKey,
} from "@/modules/entities/schemas/api-key";
import { OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import type { IApiKeyService } from "../../domain/interfaces/api-key.service.interface";

export class ApiKeyIamService implements IApiKeyService {
  async list(params: TListApiKeys): Promise<TApiKeyList> {
    const { organizationId, projectId, limit, offset, sortBy, sortDirection } = params;

    const qp: Record<string, string> = { organizationId };
    if (limit !== undefined) qp.limit = String(limit);
    if (offset !== undefined) qp.offset = String(offset);
    if (sortBy) qp.sortBy = sortBy;
    if (sortDirection) qp.sortDirection = sortDirection;

    const qs = new URLSearchParams(qp);
    const raw = await iamApi<unknown>(`/api/auth/api-key/list?${qs}`);
    const parsed = ApiKeyListSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);

    // BetterAuth filters by organizationId server-side.
    // projectId lives in metadata so we filter client-side.
    if (!projectId) return parsed.data;

    const filtered = parsed.data.apiKeys.filter(
      (k) => !k.metadata?.projectId || k.metadata.projectId === projectId,
    );
    return { ...parsed.data, apiKeys: filtered, total: filtered.length };
  }

  async create(dto: TCreateApiKey): Promise<TCreatedApiKey> {
    const body: Record<string, unknown> = {
      name: dto.name,
      organizationId: dto.organizationId,
      metadata: {
        organizationId: dto.organizationId,
        projectId: dto.projectId ?? null,
        scopes: dto.scopes,
      },
    };
    if (dto.expiresInDays) {
      body.expiresIn = dto.expiresInDays * 86400;
    }
    const raw = await iamApi<unknown>("/api/auth/api-key/create", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const parsed = CreatedApiKeySchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async revoke(params: TRevokeApiKey): Promise<void> {
    await iamApi<void>("/api/auth/api-key/delete", {
      method: "POST",
      body: JSON.stringify({ keyId: params.keyId }),
    });
  }
}
