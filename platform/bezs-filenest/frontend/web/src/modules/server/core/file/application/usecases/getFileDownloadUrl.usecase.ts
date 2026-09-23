/**
 * getFileDownloadUrl.usecase — application layer use case for generating a download URL.
 *
 * Layer: core / file / application / usecases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TFileDownloadUrl } from "@/modules/entities/schemas/file";

/**
 * Generates a presigned download URL for a file.
 *
 * @param projectId - Target project ID.
 * @param fileId    - Target file ID.
 * @param ttl       - URL TTL in seconds (default: 3600).
 * @throws ApiError propagated from the service.
 */
export async function getFileDownloadUrlUseCase(
  projectId: string,
  fileId: string,
  ttl?: number,
): Promise<TFileDownloadUrl> {
  const service = getInjection("IFileService");
  return service.getDownloadUrl(projectId, fileId, ttl);
}
