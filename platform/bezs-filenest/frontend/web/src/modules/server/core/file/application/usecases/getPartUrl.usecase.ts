/**
 * getPartUrl.usecase — return a presigned URL for uploading a single multipart chunk.
 *
 * Layer: core / file / application / use cases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TGetPartUrl, TPartUrlResponse } from "@/modules/entities/schemas/file";

/**
 * Generate a presigned PUT URL for a single part of a multipart upload.
 * Call once per chunk (1-based part numbers starting at 1).
 *
 * @param params - projectId, uploadId, and 1-based part number.
 * @returns Presigned URL valid for 3600 s by default.
 */
export async function getPartUrlUseCase(
  params: TGetPartUrl,
): Promise<TPartUrlResponse> {
  const service = getInjection("IFileService");
  return service.getPartUrl(params);
}
