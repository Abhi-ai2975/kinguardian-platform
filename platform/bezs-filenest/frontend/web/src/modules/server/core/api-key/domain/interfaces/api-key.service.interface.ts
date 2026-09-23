/**
 * api-key.service.interface — domain contract for API key management via the IAM.
 *
 * API keys are owned by BetterAuth (IAM). The service wraps IAM REST calls behind
 * this interface so use cases remain decoupled from the IAM HTTP transport.
 *
 * @module
 */
import type {
  TApiKeyList,
  TCreatedApiKey,
  TCreateApiKey,
  TListApiKeys,
  TRevokeApiKey,
} from "@/modules/entities/schemas/api-key";

export interface IApiKeyService {
  /**
   * Lists API keys for an organisation, optionally filtered to a project.
   * @param params - organizationId + optional projectId filter.
   * @throws ApiError on IAM failure.
   */
  list(params: TListApiKeys): Promise<TApiKeyList>;

  /**
   * Creates a new API key in the IAM.
   * @param dto - Validated create payload including name, scopes, and optional expiry.
   * @throws ApiError on IAM failure.
   */
  create(dto: TCreateApiKey): Promise<TCreatedApiKey>;

  /**
   * Revokes (deletes) an API key by its IAM ID.
   * @param params - keyId of the key to revoke.
   * @throws ApiError on IAM failure.
   */
  revoke(params: TRevokeApiKey): Promise<void>;
}
