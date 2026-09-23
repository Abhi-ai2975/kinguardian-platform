/**
 * createFolder.controller — validates input and creates a new folder.
 *
 * @module
 */
"server-only";

import { createFolderUseCase } from "../../application/usecases/createFolder.usecase";
import { CreateFolderParamsSchema, type TFolder } from "@/modules/entities/schemas/folder";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TFolder): TFolder { return data; }
export type TCreateFolderControllerOutput = ReturnType<typeof presenter>;

export async function createFolderController(
  input: unknown,
): Promise<TCreateFolderControllerOutput> {
  const parsed = await CreateFolderParamsSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await createFolderUseCase(parsed.data));
}
