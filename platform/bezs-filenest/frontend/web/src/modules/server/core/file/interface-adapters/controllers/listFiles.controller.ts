/**
 * listFiles.controller — interface adapter for listing project files.
 *
 * Layer: core / file / interface-adapters / controllers
 * Operation: list
 *
 * @module
 */
"server-only";

import { listFilesUseCase } from "../../application/usecases/listFiles.usecase";
import {
  ListFilesParamsSchema,
  type TFileList,
} from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TFileList): TFileList {
  return data;
}

export type TListFilesControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates input and returns a list of files for the given project.
 *
 * @param input - Raw params object from the action payload.
 * @returns File list with total count and optional cursor.
 */
export async function listFilesController(
  input: unknown,
): Promise<TListFilesControllerOutput> {
  const parsed = await ListFilesParamsSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listFilesUseCase(parsed.data);
  return presenter(data);
}
