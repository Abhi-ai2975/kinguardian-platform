/**
 * listApiKeys.controller — interface adapter for listing API keys.
 *
 * Layer: core / api-key / interface-adapters / controllers
 *
 * @module
 */
"server-only";

import { listApiKeysUseCase } from "../../application/usecases/listApiKeys.usecase";
import { ListApiKeysSchema, type TApiKeyList } from "@/modules/entities/schemas/api-key";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TApiKeyList): TApiKeyList {
  return data;
}

export type TListApiKeysControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw params from the action payload.
 * @returns List of API keys.
 */
export async function listApiKeysController(input: unknown): Promise<TListApiKeysControllerOutput> {
  const parsed = await ListApiKeysSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listApiKeysUseCase(parsed.data);
  return presenter(data);
}
