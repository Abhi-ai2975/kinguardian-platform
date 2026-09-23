/**
 * initiateMultipart.usecase — start an S3 multipart upload session.
 *
 * Layer: core / file / application / use cases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type {
  TInitiateMultipart,
  TMultipartStartResponse,
} from "@/modules/entities/schemas/file";

/**
 * Begin a multipart upload for files >= 5 MB.
 * Returns an upload_id and file_id. Use getPartUrl for each chunk.
 *
 * @param params - projectId, filename, content_type, total_size_bytes, and optional folder/tags/metadata.
 * @returns upload_id (S3 multipart session) and file_id (FileNest record).
 */
export async function initiateMultipartUseCase(
  params: TInitiateMultipart,
): Promise<TMultipartStartResponse> {
  const service = getInjection("IFileService");
  return service.initiateMultipart(params);
}
