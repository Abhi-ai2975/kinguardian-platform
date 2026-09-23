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
