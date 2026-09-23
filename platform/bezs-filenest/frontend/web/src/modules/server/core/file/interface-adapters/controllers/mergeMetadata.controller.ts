/**
 * mergeMetadata.controller — validates input and merges keys into file metadata (PATCH).
 *
 * @module
 */
"server-only";

import { mergeMetadataUseCase } from "../../application/usecases/mergeMetadata.usecase";
import { MergeMetadataSchema, type TMetadataResponse } from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TMetadataResponse): TMetadataResponse { return data; }
export type TMergeMetadataControllerOutput = ReturnType<typeof presenter>;

export async function mergeMetadataController(input: unknown): Promise<TMergeMetadataControllerOutput> {
  const parsed = await MergeMetadataSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await mergeMetadataUseCase(parsed.data));
}
