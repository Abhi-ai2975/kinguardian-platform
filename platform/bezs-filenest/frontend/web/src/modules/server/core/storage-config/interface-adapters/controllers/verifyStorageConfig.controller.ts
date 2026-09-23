/**
 * verifyStorageConfig.controller — validates input and calls the verify use case.
 *
 * @module
 */
"server-only";

import { verifyStorageConfigUseCase } from "../../application/usecases/verifyStorageConfig.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";
import {
  VerifyStorageSchema,
  type TStorageVerifyResult,
} from "@/modules/entities/schemas/storage-config";

function presenter(data: TStorageVerifyResult): TStorageVerifyResult {
  return data;
}

export type TVerifyStorageConfigControllerOutput = ReturnType<typeof presenter>;

export async function verifyStorageConfigController(
  input: unknown,
): Promise<TVerifyStorageConfigControllerOutput> {
  const parsed = await VerifyStorageSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await verifyStorageConfigUseCase(parsed.data.projectId));
}
