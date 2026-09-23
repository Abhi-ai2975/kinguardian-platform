/**
 * completeMultipart.usecase — assemble all uploaded parts into the final object.
 *
 * Layer: core / file / application / use cases
 *
 * @module
 */
"server-only";

import { getInjection } from "@/modules/server/di/container";
import type {
  TCompleteMultipart,
  TMultipartCompleteResponse,
} from "@/modules/entities/schemas/file";

/**
 * Signal S3 to assemble the parts and mark the FileNest record as ready/processing.
 *
 * @param params - projectId, uploadId, and list of { part_number, etag } for every completed part.
 * @returns file_id and final status.
 */
export async function completeMultipartUseCase(
  params: TCompleteMultipart,
): Promise<TMultipartCompleteResponse> {
  const service = getInjection("IFileService");
  return service.completeMultipart(params);
}
