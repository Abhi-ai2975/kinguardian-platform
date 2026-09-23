/**
 * mergeMetadata.usecase — merge specific keys into existing file metadata (PATCH).
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TMetadataResponse, TMergeMetadata } from "@/modules/entities/schemas/file";

export async function mergeMetadataUseCase(params: TMergeMetadata): Promise<TMetadataResponse> {
  return getInjection("IFileService").mergeMetadata(params.projectId, params.fileId, params.metadata);
}
