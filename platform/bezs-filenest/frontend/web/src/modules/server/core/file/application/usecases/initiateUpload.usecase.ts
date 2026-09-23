/**
 * initiateUpload.usecase — create a file record and return a presigned PUT URL.
 *
 * Layer: core / file / application / use cases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type {
  TInitiateUpload,
  TUploadInitResponse,
} from "@/modules/entities/schemas/file";

/**
 * Initiate a single-file upload. Returns a short-lived presigned PUT URL the
 * browser or server can use to transfer bytes directly to object storage.
 *
 * @param params - projectId, filename, content_type, size_bytes, and optional folder/tags/metadata.
 * @returns file_id and presigned upload_url.
 */
export async function initiateUploadUseCase(
  params: TInitiateUpload,
): Promise<TUploadInitResponse> {
  const service = getInjection("IFileService");
  return service.initiateUpload(params);
}
