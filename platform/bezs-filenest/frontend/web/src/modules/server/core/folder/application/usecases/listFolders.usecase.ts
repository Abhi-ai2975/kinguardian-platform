/**
 * listFolders.usecase — returns all folders in a project.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TFolderList } from "@/modules/entities/schemas/folder";

export async function listFoldersUseCase(projectId: string): Promise<TFolderList> {
  return getInjection("IFolderService").list(projectId);
}
