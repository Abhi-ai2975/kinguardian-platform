/**
 * deleteWebhook.controller — validates input and delegates to the delete use case.
 *
 * @module
 */
"server-only";

import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import { DeleteWebhookSchema } from "@/modules/entities/schemas/webhook";
import { deleteWebhookUseCase } from "../../application/usecases/deleteWebhook.usecase";

export type TDeleteWebhookControllerOutput = undefined;

export async function deleteWebhookController(
  input: unknown,
): Promise<TDeleteWebhookControllerOutput> {
  const parsed = await DeleteWebhookSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteWebhookUseCase(parsed.data.projectId, parsed.data.webhookId);
  return undefined;
}
