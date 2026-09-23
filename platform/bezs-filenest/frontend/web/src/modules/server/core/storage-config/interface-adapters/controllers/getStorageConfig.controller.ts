/**
 * getStorageConfig.controller — validates input and calls the get use case.
 *
 * @module
 */
"server-only";

import { getStorageConfigUseCase } from "../../application/usecases/getStorageConfig.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import { VerifyStorageSchema } from "@/modules/entities/schemas/storage-config";
import type { TStorageConfig } from "@/modules/entities/schemas/storage-config";

function presenter(data: TStorageConfig): TStorageConfig {
  return data;
}

export type TGetStorageConfigControllerOutput = ReturnType<typeof presenter>;

export async function getStorageConfigController(
  input: unknown,
): Promise<TGetStorageConfigControllerOutput> {
  const parsed = await VerifyStorageSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await getStorageConfigUseCase(parsed.data.projectId));
}
