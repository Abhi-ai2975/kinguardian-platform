/**
 * listFolders.controller — validates input and returns all project folders.
 *
 * @module
 */
"server-only";

import { listFoldersUseCase } from "../../application/usecases/listFolders.usecase";
import { ListFoldersParamsSchema, type TFolderList } from "@/modules/entities/schemas/folder";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TFolderList): TFolderList { return data; }
export type TListFoldersControllerOutput = ReturnType<typeof presenter>;

export async function listFoldersController(input: unknown): Promise<TListFoldersControllerOutput> {
  const parsed = await ListFoldersParamsSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await listFoldersUseCase(parsed.data.projectId));
}
