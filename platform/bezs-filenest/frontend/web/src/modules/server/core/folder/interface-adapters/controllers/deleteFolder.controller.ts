/**
 * deleteFolder.controller — validates input and soft-deletes a folder.
 *
 * @module
 */
"server-only";

import { deleteFolderUseCase } from "../../application/usecases/deleteFolder.usecase";
import {
  DeleteFolderParamsSchema,
  type TFolderDeleteResponse,
} from "@/modules/entities/schemas/folder";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TFolderDeleteResponse): TFolderDeleteResponse { return data; }
export type TDeleteFolderControllerOutput = ReturnType<typeof presenter>;

export async function deleteFolderController(
  input: unknown,
): Promise<TDeleteFolderControllerOutput> {
  const parsed = await DeleteFolderParamsSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await deleteFolderUseCase(parsed.data.projectId, parsed.data.folderId));
}
