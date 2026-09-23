/**
 * @module admin/oauthclient.service
 * @description Infrastructure service for OAuth client management operations.
 *              Each method calls Better Auth's OAuth provider API and validates
 *              responses with Zod. All sensitive fields (client_secret) are
 *              stripped from log output.
 * @category Infrastructure
 * @layer Infrastructure
 *
 * **Better Auth return type gotchas:**
 * - `adminCreateOAuthClient` returns the client **directly** (no wrapper)
 * - `adminUpdateOAuthClient` returns client directly
 * - `deleteOAuthClient` returns `void` — we build `{ success: true }` manually
 * - `getOAuthClient` is a GET request — use `query:` not `body:`
 * - `rotateClientSecret` returns the full client with the new secret
 */

import { randomUUID } from "crypto";
import { IOAuthClientService } from "@/modules/server/core/admin/domain/interfaces/oauthclient.service.interface";
import { TCreateOAuthClientPayload } from "@/modules/entities/types/admin/oauthclient.type";
import {
  TGetOAuthClientsResponseDtoSchema,
  GetOAuthClientsResponseDtoSchema,
  TCreateOAuthClientResponseDtoSchema,
  CreateOAuthClientResponseDtoSchema,
  TGetOAuthClientResponseDtoSchema,
  GetOAuthClientResponseDtoSchema,
  TDeleteOAuthClientResponseDtoSchema,
  TUpdateOAuthClientValidationSchema,
  TDeleteOAuthClientValidationSchema,
  TGetOAuthClientValidationSchema,
  TRotateClientSecretValidationSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import { auth } from "@/modules/server/auth-provider/auth";
import { headers } from "next/headers";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { mapBetterAuthError } from "@/modules/server/shared/errors/mappers/mapBetterAuthError";

export class OAuthClientService implements IOAuthClientService {
  /**
   * Create a new OAuth 2.1 client.
   * Returns the full client object **including** `client_secret` —
   * this is the only time the secret is available in plaintext.
   * The UI must show it once (two-phase modal pattern).
   *
   * @returns The created client with its one-time `client_secret`.
   */
  async createOAuthClient(
    payload: TCreateOAuthClientPayload,
  ): Promise<TCreateOAuthClientResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "OAuthClientService.createOAuthClient", startTimeMs, context: { operationId } });
    try {
      const res = await auth.api.adminCreateOAuthClient({
        headers: await headers(),
        body: {
          ...payload,
          contacts: payload.contacts?.length ? payload.contacts : undefined,
          post_logout_redirect_uris: payload.post_logout_redirect_uris?.length
            ? payload.post_logout_redirect_uris
            : undefined,
        },
      });
      const data = await CreateOAuthClientResponseDtoSchema.parseAsync(res);
      // Strip client_secret from log — it's a one-time credential
      const { client_secret: _secret, ...loggableData } = data;
      logOperation("success", {
        name: "OAuthClientService.createOAuthClient",
        startTimeMs,
        data: loggableData,
        context: { operationId },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OAuthClientService.createOAuthClient",
        startTimeMs,
        err: error,
        context: { operationId },
      });
      mapBetterAuthError(error, "Failed to create OAuth client");
    }
  }

  /**
   * Update an existing OAuth client's metadata (name, redirect URIs, etc.).
   * Does NOT return the client secret — only public fields.
   *
   * @param payload - Client ID plus `update` object with changed fields.
   * @returns The updated client (without secret).
   */
  async updateOAuthClient(
    payload: TUpdateOAuthClientValidationSchema,
  ): Promise<TGetOAuthClientResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OAuthClientService.updateOAuthClient",
      startTimeMs,
      context: { operationId, clientId: payload.client_id },
    });
    try {
      const res = await auth.api.adminUpdateOAuthClient({
        headers: await headers(),
        body: {
          client_id: payload.client_id,
          update: {
            ...payload.update,
            contacts: payload.update.contacts?.length
              ? payload.update.contacts
              : undefined,
            post_logout_redirect_uris: payload.update.post_logout_redirect_uris?.length
              ? payload.update.post_logout_redirect_uris
              : undefined,
          },
        },
      });
      const data = await GetOAuthClientResponseDtoSchema.parseAsync(res);
      logOperation("success", {
        name: "OAuthClientService.updateOAuthClient",
        startTimeMs,
        data,
        context: { operationId, clientId: payload.client_id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OAuthClientService.updateOAuthClient",
        startTimeMs,
        err: error,
        context: { operationId, clientId: payload.client_id },
      });
      mapBetterAuthError(error, "Failed to update OAuth client");
    }
  }

  /**
   * Delete an OAuth client permanently.
   * ⚠️ **Gotcha:** `deleteOAuthClient` returns `void` — we build `{ success: true }`.
   *
   * @returns `{ success: true }` on success.
   */
  async deleteOAuthClient(
    payload: TDeleteOAuthClientValidationSchema,
  ): Promise<TDeleteOAuthClientResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OAuthClientService.deleteOAuthClient",
      startTimeMs,
      context: { operationId, clientId: payload.client_id },
    });
    try {
      await auth.api.deleteOAuthClient({
        headers: await headers(),
        body: { client_id: payload.client_id },
      });
      const data = { success: true };
      logOperation("success", {
        name: "OAuthClientService.deleteOAuthClient",
        startTimeMs,
        data,
        context: { operationId, clientId: payload.client_id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OAuthClientService.deleteOAuthClient",
        startTimeMs,
        err: error,
        context: { operationId, clientId: payload.client_id },
      });
      mapBetterAuthError(error, "Failed to delete OAuth client");
    }
  }

  /**
   * Get a single OAuth client by ID.
   * ⚠️ **Gotcha:** This is a GET request — uses `query:` not `body:`.
   *
   * @returns The full client object (without secret).
   */
  async getOAuthClient(
    payload: TGetOAuthClientValidationSchema,
  ): Promise<TGetOAuthClientResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OAuthClientService.getOAuthClient",
      startTimeMs,
      context: { operationId, clientId: payload.client_id },
    });
    try {
      const res = await auth.api.getOAuthClient({
        headers: await headers(),
        query: { client_id: payload.client_id },
      });
      const data = await GetOAuthClientResponseDtoSchema.parseAsync(res);
      logOperation("success", {
        name: "OAuthClientService.getOAuthClient",
        startTimeMs,
        data,
        context: { operationId, clientId: payload.client_id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OAuthClientService.getOAuthClient",
        startTimeMs,
        err: error,
        context: { operationId, clientId: payload.client_id },
      });
      mapBetterAuthError(error, "Failed to get OAuth client");
    }
  }

  /**
   * Rotate (regenerate) an OAuth client's secret.
   * Old secret is immediately invalidated. The new secret is returned once —
   * the UI must show it in a two-phase modal and never display it again.
   *
   * @returns The client with the **new** `client_secret` (one-time display).
   */
  async rotateClientSecret(
    payload: TRotateClientSecretValidationSchema,
  ): Promise<TGetOAuthClientResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "OAuthClientService.rotateClientSecret",
      startTimeMs,
      context: { operationId, clientId: payload.client_id },
    });
    try {
      const res = await auth.api.rotateClientSecret({
        headers: await headers(),
        body: { client_id: payload.client_id },
      });
      const data = await GetOAuthClientResponseDtoSchema.parseAsync(res);
      // Strip client_secret from log — newly rotated secret is sensitive
      const { client_secret: _secret, ...loggableData } = data;
      logOperation("success", {
        name: "OAuthClientService.rotateClientSecret",
        startTimeMs,
        data: loggableData,
        context: { operationId, clientId: payload.client_id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "OAuthClientService.rotateClientSecret",
        startTimeMs,
        err: error,
        context: { operationId, clientId: payload.client_id },
      });
      mapBetterAuthError(error, "Failed to rotate client secret");
    }
  }

  /**
   * List all OAuth clients in the system.
   * No pagination — returns all clients at once.
   *
   * @returns Array of client objects (without secrets).
   */
  async getOAuthClients(): Promise<TGetOAuthClientsResponseDtoSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "OAuthClientService.getOAuthClients", startTimeMs, context: { operationId } });
    try {
      const res = await auth.api.getOAuthClients({ headers: await headers() });
      const data = await GetOAuthClientsResponseDtoSchema.parseAsync(res);
      logOperation("success", { name: "OAuthClientService.getOAuthClients", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "OAuthClientService.getOAuthClients", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to list OAuth clients");
    }
  }
}
