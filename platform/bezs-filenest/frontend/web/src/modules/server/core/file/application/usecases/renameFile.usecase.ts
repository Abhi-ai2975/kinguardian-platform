/**
 * renameFile.usecase — updates a file's display filename.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TFile } from "@/modules/entities/schemas/file";

export async function renameFileUseCase(
  projectId: string,
  fileId: string,
  filename: string,
): Promise<TFile> {
  return getInjection("IFileService").rename(projectId, fileId, filename);
}
