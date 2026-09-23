/**
 * updateWebhook.controller — validates input and delegates to the update use case.
 *
 * @module
 */
"server-only";

import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import {
  UpdateWebhookSchema,
  type TWebhook,
} from "@/modules/entities/schemas/webhook";
import { updateWebhookUseCase } from "../../application/usecases/updateWebhook.usecase";

function presenter(data: TWebhook): TWebhook {
  return data;
}

export type TUpdateWebhookControllerOutput = ReturnType<typeof presenter>;

export async function updateWebhookController(
  input: unknown,
): Promise<TUpdateWebhookControllerOutput> {
  const parsed = await UpdateWebhookSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateWebhookUseCase(parsed.data);
  return presenter(data);
}
