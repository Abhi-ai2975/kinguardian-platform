/**
 * webhook.service.interface — IWebhookService contract for the webhook domain.
 *
 * Use cases depend on this interface, not the concrete REST service, keeping
 * the application layer decoupled from HTTP transport details.
 *
 * @module
 */
"server-only";

import type {
  TWebhook,
  TWebhookList,
  TCreateWebhook,
  TUpdateWebhook,
} from "@/modules/entities/schemas/webhook";

export interface IWebhookService {
  /** Returns all webhooks for the given project. */
  list(projectId: string): Promise<TWebhookList>;

  /** Creates a new webhook. The response includes signing_secret (shown once). */
  create(dto: TCreateWebhook): Promise<TWebhook>;

  /** Partially updates an existing webhook. */
  update(dto: TUpdateWebhook): Promise<TWebhook>;

  /** Permanently deletes a webhook. */
  delete(projectId: string, webhookId: string): Promise<void>;
}
