/**
 * moveFile.usecase — moves a file to a folder (or to root when folderId is null).
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TFile } from "@/modules/entities/schemas/file";

export async function moveFileUseCase(
  projectId: string,
  fileId: string,
  folderId: string | null,
): Promise<TFile> {
  return getInjection("IFileService").move(projectId, fileId, folderId);
}
