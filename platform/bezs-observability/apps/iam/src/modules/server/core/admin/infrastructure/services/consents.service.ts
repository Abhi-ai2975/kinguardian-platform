import { randomUUID } from "crypto";
import { auth } from "@/modules/server/auth-provider/auth";
import { headers } from "next/headers";
import { IConsentsService } from "../../domain/interfaces/consents.service.interface";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { mapBetterAuthError } from "@/modules/server/shared/errors/mappers/mapBetterAuthError";
import {
  ConsentSchema,
  ListConsentsResponseSchema,
  TConsentSchema,
  TDeleteConsentValidationSchema,
  TGetConsentValidationSchema,
  TListConsentsResponseSchema,
  TUpdateConsentScopesValidationSchema,
} from "@/modules/entities/schemas/admin/consents/consents.schema";

export class ConsentsService implements IConsentsService {
  async listConsents(): Promise<TListConsentsResponseSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", { name: "ConsentsService.listConsents", startTimeMs, context: { operationId } });
    try {
      const res = await auth.api.getOAuthConsents({ headers: await headers() });
      const data = await ListConsentsResponseSchema.parseAsync(res);
      logOperation("success", { name: "ConsentsService.listConsents", startTimeMs, data, context: { operationId } });
      return data;
    } catch (error) {
      logOperation("error", { name: "ConsentsService.listConsents", startTimeMs, err: error, context: { operationId } });
      mapBetterAuthError(error, "Failed to list consents");
    }
  }

  async getConsent(payload: TGetConsentValidationSchema): Promise<TConsentSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "ConsentsService.getConsent",
      startTimeMs,
      context: { operationId, consentId: payload.id },
    });
    try {
      const res = await auth.api.getOAuthConsent({
        headers: await headers(),
        query: { id: payload.id },
      });
      const data = await ConsentSchema.parseAsync(res);
      logOperation("success", {
        name: "ConsentsService.getConsent",
        startTimeMs,
        data,
        context: { operationId, consentId: payload.id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "ConsentsService.getConsent",
        startTimeMs,
        err: error,
        context: { operationId, consentId: payload.id },
      });
      mapBetterAuthError(error, "Failed to get consent");
    }
  }

  async updateConsentScopes(
    payload: TUpdateConsentScopesValidationSchema,
  ): Promise<TConsentSchema> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "ConsentsService.updateConsentScopes",
      startTimeMs,
      context: { operationId, consentId: payload.id },
    });
    try {
      const res = await auth.api.updateOAuthConsent({
        headers: await headers(),
        body: { id: payload.id, update: { scopes: payload.scopes } },
      });
      const data = await ConsentSchema.parseAsync(res);
      logOperation("success", {
        name: "ConsentsService.updateConsentScopes",
        startTimeMs,
        data,
        context: { operationId, consentId: payload.id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "ConsentsService.updateConsentScopes",
        startTimeMs,
        err: error,
        context: { operationId, consentId: payload.id },
      });
      mapBetterAuthError(error, "Failed to update consent scopes");
    }
  }

  async deleteConsent(
    payload: TDeleteConsentValidationSchema,
  ): Promise<{ success: boolean }> {
    const startTimeMs = Date.now();
    const operationId = randomUUID();
    logOperation("start", {
      name: "ConsentsService.deleteConsent",
      startTimeMs,
      context: { operationId, consentId: payload.id },
    });
    try {
      await auth.api.deleteOAuthConsent({
        headers: await headers(),
        body: { id: payload.id },
      });
      const data = { success: true };
      logOperation("success", {
        name: "ConsentsService.deleteConsent",
        startTimeMs,
        data,
        context: { operationId, consentId: payload.id },
      });
      return data;
    } catch (error) {
      logOperation("error", {
        name: "ConsentsService.deleteConsent",
        startTimeMs,
        err: error,
        context: { operationId, consentId: payload.id },
      });
      mapBetterAuthError(error, "Failed to delete consent");
    }
  }
}
