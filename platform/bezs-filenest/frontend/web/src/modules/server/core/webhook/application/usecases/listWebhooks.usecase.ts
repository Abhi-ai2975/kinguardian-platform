/**
 * listWebhooks.usecase — fetches all webhooks for a project.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TWebhookList } from "@/modules/entities/schemas/webhook";

export async function listWebhooksUseCase(projectId: string): Promise<TWebhookList> {
  const service = getInjection("IWebhookService");
  return service.list(projectId);
}
