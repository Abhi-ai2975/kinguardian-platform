/**
 * renameFile.controller — validates input and renames a file.
 *
 * @module
 */
"server-only";

import { renameFileUseCase } from "../../application/usecases/renameFile.usecase";
import { RenameFileSchema, type TFile } from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TFile): TFile { return data; }
export type TRenameFileControllerOutput = ReturnType<typeof presenter>;

export async function renameFileController(input: unknown): Promise<TRenameFileControllerOutput> {
  const parsed = await RenameFileSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(
    await renameFileUseCase(parsed.data.projectId, parsed.data.fileId, parsed.data.filename),
  );
}
