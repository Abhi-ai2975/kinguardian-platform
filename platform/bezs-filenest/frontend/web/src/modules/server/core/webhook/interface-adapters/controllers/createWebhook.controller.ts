/**
 * createWebhook.controller — validates input and delegates to the create use case.
 *
 * @module
 */
"server-only";

import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import {
  CreateWebhookSchema,
  type TWebhook,
} from "@/modules/entities/schemas/webhook";
import { createWebhookUseCase } from "../../application/usecases/createWebhook.usecase";

function presenter(data: TWebhook): TWebhook {
  return data;
}

export type TCreateWebhookControllerOutput = ReturnType<typeof presenter>;

export async function createWebhookController(
  input: unknown,
): Promise<TCreateWebhookControllerOutput> {
  const parsed = await CreateWebhookSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createWebhookUseCase(parsed.data);
  return presenter(data);
}
