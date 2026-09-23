/**
 * deleteFile.usecase — application layer use case for deleting a file.
 *
 * Layer: core / file / application / usecases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";

/**
 * Soft-deletes a file. Bytes are removed asynchronously via background event.
 *
 * @param projectId - Target project ID.
 * @param fileId    - Target file ID.
 * @throws ApiError propagated from the service.
 */
export async function deleteFileUseCase(
  projectId: string,
  fileId: string,
): Promise<void> {
  const service = getInjection("IFileService");
  return service.delete(projectId, fileId);
}
