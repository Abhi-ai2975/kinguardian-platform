/**
 * deleteFolder.usecase — soft-deletes a folder (must be empty).
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TFolderDeleteResponse } from "@/modules/entities/schemas/folder";

export async function deleteFolderUseCase(
  projectId: string,
  folderId: string,
): Promise<TFolderDeleteResponse> {
  return getInjection("IFolderService").delete(projectId, folderId);
}
