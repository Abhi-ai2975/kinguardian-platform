/**
 * listFiles.usecase — application layer use case for listing files.
 *
 * Layer: core / file / application / usecases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TFileList, TListFilesParams } from "@/modules/entities/schemas/file";

/**
 * Returns a page of files for the given project.
 *
 * @param params - projectId + optional pagination/filter params.
 * @throws ApiError propagated from the service.
 */
export async function listFilesUseCase(
  params: TListFilesParams,
): Promise<TFileList> {
  const { projectId, ...rest } = params;
  const service = getInjection("IFileService");
  return service.list(projectId, rest);
}
