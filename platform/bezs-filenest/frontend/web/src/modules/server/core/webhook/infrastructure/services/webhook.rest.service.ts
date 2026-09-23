/**
 * webhook.rest.service — IWebhookService implementation via the FileNest REST API.
 *
 * All requests are forwarded to /v1/projects/{projectId}/webhooks using the
 * shared filenestApi client which injects the server-side API key and base URL.
 *
 * @module
 */
"server-only";

import { filenestApi } from "@/modules/server/utils/api-client";
import { OutputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import {
  WebhookSchema,
  WebhookListSchema,
  type TWebhook,
  type TWebhookList,
  type TCreateWebhook,
  type TUpdateWebhook,
} from "@/modules/entities/schemas/webhook";
import type { IWebhookService } from "../../domain/interfaces/webhook.service.interface";

export class WebhookRestService implements IWebhookService {
  async list(projectId: string): Promise<TWebhookList> {
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/webhooks`,
    );
    const parsed = WebhookListSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async create(dto: TCreateWebhook): Promise<TWebhook> {
    const { projectId, ...body } = dto;
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/webhooks`,
      { method: "POST", body: JSON.stringify(body) },
    );
    const parsed = WebhookSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async update(dto: TUpdateWebhook): Promise<TWebhook> {
    const { projectId, webhookId, ...body } = dto;
    const raw = await filenestApi<unknown>(
      `/v1/projects/${projectId}/webhooks/${webhookId}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    const parsed = WebhookSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }

  async delete(projectId: string, webhookId: string): Promise<void> {
    await filenestApi<unknown>(
      `/v1/projects/${projectId}/webhooks/${webhookId}`,
      { method: "DELETE" },
    );
  }
}
