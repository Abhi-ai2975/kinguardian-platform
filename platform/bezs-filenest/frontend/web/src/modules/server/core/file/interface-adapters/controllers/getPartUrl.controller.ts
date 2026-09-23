/**
 * getPartUrl.controller — validates part-URL request and returns presigned URL.
 *
 * Layer: core / file / interface-adapters / controllers
 *
 * @module
 */
"server-only";

import { getPartUrlUseCase } from "../../application/usecases/getPartUrl.usecase";
import {
  GetPartUrlSchema,
  type TPartUrlResponse,
} from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TPartUrlResponse): TPartUrlResponse {
  return data;
}

export type TGetPartUrlControllerOutput = ReturnType<typeof presenter>;

/**
 * Generate a presigned PUT URL for a single multipart chunk.
 *
 * @param input - Raw payload with projectId, uploadId, and 1-based part number.
 * @returns Presigned URL valid for 3600 s.
 * @throws InputParseError if params fail schema validation.
 */
export async function getPartUrlController(
  input: unknown,
): Promise<TGetPartUrlControllerOutput> {
  const parsed = await GetPartUrlSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getPartUrlUseCase(parsed.data);
  return presenter(data);
}
