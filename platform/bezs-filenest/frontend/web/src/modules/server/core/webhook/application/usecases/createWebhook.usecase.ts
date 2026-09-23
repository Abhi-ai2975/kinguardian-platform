/**
 * createWebhook.usecase — creates a new webhook endpoint for a project.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TWebhook, TCreateWebhook } from "@/modules/entities/schemas/webhook";

export async function createWebhookUseCase(dto: TCreateWebhook): Promise<TWebhook> {
  const service = getInjection("IWebhookService");
  return service.create(dto);
}
