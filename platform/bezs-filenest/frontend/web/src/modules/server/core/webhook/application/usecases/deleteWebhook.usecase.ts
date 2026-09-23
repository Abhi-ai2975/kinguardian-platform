/**
 * deleteWebhook.usecase — permanently deletes a webhook.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";

export async function deleteWebhookUseCase(
  projectId: string,
  webhookId: string,
): Promise<void> {
  const service = getInjection("IWebhookService");
  return service.delete(projectId, webhookId);
}
