/**
 * getFileDownloadUrl.controller — interface adapter for generating a file download URL.
 *
 * Layer: core / file / interface-adapters / controllers
 * Operation: getDownloadUrl
 *
 * @module
 */
"server-only";

import { getFileDownloadUrlUseCase } from "../../application/usecases/getFileDownloadUrl.usecase";
import {
  GetFileDownloadUrlSchema,
  type TFileDownloadUrl,
} from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TFileDownloadUrl): TFileDownloadUrl {
  return data;
}

export type TGetFileDownloadUrlControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates input and returns a presigned download URL for the file.
 *
 * @param input - Raw payload from the action.
 */
export async function getFileDownloadUrlController(
  input: unknown,
): Promise<TGetFileDownloadUrlControllerOutput> {
  const parsed = await GetFileDownloadUrlSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getFileDownloadUrlUseCase(
    parsed.data.projectId,
    parsed.data.fileId,
    parsed.data.ttl,
  );
  return presenter(data);
}
