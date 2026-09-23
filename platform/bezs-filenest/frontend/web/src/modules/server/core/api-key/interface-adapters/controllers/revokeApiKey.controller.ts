/**
 * revokeApiKey.controller — interface adapter for revoking an API key.
 *
 * Layer: core / api-key / interface-adapters / controllers
 *
 * @module
 */
"server-only";

import { revokeApiKeyUseCase } from "../../application/usecases/revokeApiKey.usecase";
import { RevokeApiKeySchema } from "@/modules/entities/schemas/api-key";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

export type TRevokeApiKeyControllerOutput = void;

/**
 * @param input - Raw revoke payload from the action.
 */
export async function revokeApiKeyController(input: unknown): Promise<TRevokeApiKeyControllerOutput> {
  const parsed = await RevokeApiKeySchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await revokeApiKeyUseCase(parsed.data);
}
