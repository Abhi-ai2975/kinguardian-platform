/**
 * createApiKey.controller — interface adapter for creating an API key.
 *
 * Layer: core / api-key / interface-adapters / controllers
 *
 * @module
 */
"server-only";

import { createApiKeyUseCase } from "../../application/usecases/createApiKey.usecase";
import { CreateApiKeySchema, type TCreatedApiKey } from "@/modules/entities/schemas/api-key";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TCreatedApiKey): TCreatedApiKey {
  return data;
}

export type TCreateApiKeyControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw create payload from the action.
 * @returns The newly created API key including the full key string.
 */
export async function createApiKeyController(input: unknown): Promise<TCreateApiKeyControllerOutput> {
  const parsed = await CreateApiKeySchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createApiKeyUseCase(parsed.data);
  return presenter(data);
}
