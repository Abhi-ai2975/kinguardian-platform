/**
 * updateWebhook.usecase — partially updates an existing webhook.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TWebhook, TUpdateWebhook } from "@/modules/entities/schemas/webhook";

export async function updateWebhookUseCase(dto: TUpdateWebhook): Promise<TWebhook> {
  const service = getInjection("IWebhookService");
  return service.update(dto);
}
