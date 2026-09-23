/**
 * createFolder.usecase — creates a folder (optionally nested) in a project.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TFolder, TCreateFolderParams } from "@/modules/entities/schemas/folder";

export async function createFolderUseCase(params: TCreateFolderParams): Promise<TFolder> {
  return getInjection("IFolderService").create(params);
}
