/**
 * listWebhooks.controller — validates input and delegates to the list use case.
 *
 * @module
 */
"server-only";

import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import { ListWebhooksParamsSchema, type TWebhookList } from "@/modules/entities/schemas/webhook";
import { listWebhooksUseCase } from "../../application/usecases/listWebhooks.usecase";

function presenter(data: TWebhookList): TWebhookList {
  return data;
}

export type TListWebhooksControllerOutput = ReturnType<typeof presenter>;

export async function listWebhooksController(
  input: unknown,
): Promise<TListWebhooksControllerOutput> {
  const parsed = await ListWebhooksParamsSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listWebhooksUseCase(parsed.data.projectId);
  return presenter(data);
}
