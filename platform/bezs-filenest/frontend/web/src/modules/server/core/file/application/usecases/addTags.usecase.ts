/**
 * addTags.usecase — append tags not already present on a file (union, no duplicates).
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TTagsResponse, TAddTags } from "@/modules/entities/schemas/file";

export async function addTagsUseCase(params: TAddTags): Promise<TTagsResponse> {
  return getInjection("IFileService").addTags(params.projectId, params.fileId, params.tags);
}
