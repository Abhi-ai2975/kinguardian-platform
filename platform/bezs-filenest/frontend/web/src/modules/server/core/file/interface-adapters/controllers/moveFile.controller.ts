/**
 * moveFile.controller — validates input and moves a file to a folder.
 *
 * @module
 */
"server-only";

import { moveFileUseCase } from "../../application/usecases/moveFile.usecase";
import { MoveFileSchema, type TFile } from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TFile): TFile { return data; }
export type TMoveFileControllerOutput = ReturnType<typeof presenter>;

export async function moveFileController(input: unknown): Promise<TMoveFileControllerOutput> {
  const parsed = await MoveFileSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(
    await moveFileUseCase(parsed.data.projectId, parsed.data.fileId, parsed.data.folder_id),
  );
}
