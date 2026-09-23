/**
 * abortMultipart.usecase — discard an in-progress multipart upload.
 *
 * Layer: core / file / application / use cases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TAbortMultipart, TMultipartAbortResponse } from "@/modules/entities/schemas/file";

/**
 * Abort a multipart upload session. S3 discards any uploaded parts.
 * Always call on error or cancellation to avoid orphaned parts.
 *
 * @param params - projectId and uploadId to abort.
 * @returns Confirmation with aborted: true.
 */
export async function abortMultipartUseCase(
  params: TAbortMultipart,
): Promise<TMultipartAbortResponse> {
  const service = getInjection("IFileService");
  return service.abortMultipart(params);
}
