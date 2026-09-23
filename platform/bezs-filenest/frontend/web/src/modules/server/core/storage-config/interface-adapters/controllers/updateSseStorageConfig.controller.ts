/**
 * updateSseStorageConfig.controller — validates input and calls the SSE toggle use case.
 *
 * @module
 */
"server-only";

import { updateSseStorageConfigUseCase } from "../../application/usecases/updateSseStorageConfig.usecase";
import {
  InputParseError,
  OutputParseError,
} from "@/modules/server/shared/errors/schema-parse-error";
import {
  UpdateSseSchema,
  StorageConfigSchema,
  type TStorageConfig,
} from "@/modules/entities/schemas/storage-config";

function presenter(data: TStorageConfig): TStorageConfig {
  return data;
}

export type TUpdateSseStorageConfigControllerOutput = ReturnType<typeof presenter>;

export async function updateSseStorageConfigController(
  input: unknown,
): Promise<TUpdateSseStorageConfigControllerOutput> {
  const parsed = await UpdateSseSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateSseStorageConfigUseCase(parsed.data.projectId, parsed.data.sse_enabled);
  const out = StorageConfigSchema.safeParse(data);
  if (!out.success) throw new OutputParseError(out.error);
  return presenter(out.data);
}
