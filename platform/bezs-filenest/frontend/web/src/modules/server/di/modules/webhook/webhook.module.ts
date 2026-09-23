/**
 * webhook.module — DI registration for the webhook domain.
 *
 * Binds IWebhookService to WebhookRestService.
 *
 * @module
 */
import type { Container } from "@evyweb/ioctopus";
import { WebhookRestService } from "@/modules/server/core/webhook/infrastructure/services/webhook.rest.service";
import { DI_SYMBOLS } from "../../types";

/**
 * Registers the webhook module into the DI container.
 *
 * @param container - The ioctopus application container.
 */
export function registerWebhookModule(container: Container): void {
  container.bind(DI_SYMBOLS.IWebhookService).toClass(WebhookRestService);
}
