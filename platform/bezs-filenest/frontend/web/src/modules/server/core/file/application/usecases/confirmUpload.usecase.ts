/**
 * confirmUpload.usecase — notify the backend that bytes were PUT to storage.
 *
 * Layer: core / file / application / use cases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TConfirmUploadResponse } from "@/modules/entities/schemas/file";

/**
 * Confirm that the client has finished uploading bytes to the presigned URL.
 * Transitions file status to processing (if virus scan is on) or ready.
 *
 * @param projectId - The project owning the file.
 * @param fileId    - The file record created by initiateUpload.
 * @returns Updated file id and status.
 */
export async function confirmUploadUseCase(
  projectId: string,
  fileId: string,
): Promise<TConfirmUploadResponse> {
  const service = getInjection("IFileService");
  return service.confirmUpload(projectId, fileId);
}
