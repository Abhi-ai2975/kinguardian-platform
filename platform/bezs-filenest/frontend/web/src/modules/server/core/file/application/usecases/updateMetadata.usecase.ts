/**
 * updateMetadata.usecase — replace the entire metadata object on a file (PUT).
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type { TMetadataResponse, TUpdateMetadata } from "@/modules/entities/schemas/file";

export async function updateMetadataUseCase(params: TUpdateMetadata): Promise<TMetadataResponse> {
  return getInjection("IFileService").updateMetadata(params.projectId, params.fileId, params.metadata);
}
