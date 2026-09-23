/**
 * updateStorageConfig.controller — validates input and calls the update use case.
 *
 * @module
 */
"server-only";

import { updateStorageConfigUseCase } from "../../application/usecases/updateStorageConfig.usecase";
import {
  InputParseError,
  OutputParseError,
} from "@/modules/server/shared/errors/schema-parse-error";
import {
  UpdateStorageConfigSchema,
  StorageConfigSchema,
  type TStorageConfig,
} from "@/modules/entities/schemas/storage-config";

function presenter(data: TStorageConfig): TStorageConfig {
  return data;
}

export type TUpdateStorageConfigControllerOutput = ReturnType<typeof presenter>;

export async function updateStorageConfigController(
  input: unknown,
): Promise<TUpdateStorageConfigControllerOutput> {
  const parsed = await UpdateStorageConfigSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateStorageConfigUseCase(parsed.data);
  const out = StorageConfigSchema.safeParse(data);
  if (!out.success) throw new OutputParseError(out.error);
  return presenter(out.data);
}
