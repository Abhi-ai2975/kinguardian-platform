/**
 * setTags.usecase — replace the full tag list on a file.
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TTagsResponse, TSetTags } from "@/modules/entities/schemas/file";

export async function setTagsUseCase(params: TSetTags): Promise<TTagsResponse> {
  return getInjection("IFileService").setTags(params.projectId, params.fileId, params.tags);
}
