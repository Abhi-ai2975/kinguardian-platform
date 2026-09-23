/**
 * deleteFile.controller — interface adapter for deleting a file.
 *
 * Layer: core / file / interface-adapters / controllers
 * Operation: delete
 *
 * @module
 */
"server-only";

import { deleteFileUseCase } from "../../application/usecases/deleteFile.usecase";
import { DeleteFileSchema } from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

export type TDeleteFileControllerOutput = void;

/**
 * Validates input and soft-deletes the specified file.
 *
 * @param input - Raw payload from the action (must include projectId + fileId).
 */
export async function deleteFileController(
  input: unknown,
): Promise<TDeleteFileControllerOutput> {
  const parsed = await DeleteFileSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteFileUseCase(parsed.data.projectId, parsed.data.fileId);
}
