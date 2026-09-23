/**
 * updateMetadata.controller — validates input and replaces file metadata (PUT).
 *
 * @module
 */
"server-only";

import { updateMetadataUseCase } from "../../application/usecases/updateMetadata.usecase";
import { UpdateMetadataSchema, type TMetadataResponse } from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TMetadataResponse): TMetadataResponse { return data; }
export type TUpdateMetadataControllerOutput = ReturnType<typeof presenter>;

export async function updateMetadataController(input: unknown): Promise<TUpdateMetadataControllerOutput> {
  const parsed = await UpdateMetadataSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await updateMetadataUseCase(parsed.data));
}
