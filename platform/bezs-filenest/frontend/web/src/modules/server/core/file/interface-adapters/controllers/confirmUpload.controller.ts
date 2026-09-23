/**
 * confirmUpload.controller — validates confirmation input and transitions file status.
 *
 * Layer: core / file / interface-adapters / controllers
 *
 * @module
 */
"server-only";

import { confirmUploadUseCase } from "../../application/usecases/confirmUpload.usecase";
import {
  ConfirmUploadSchema,
  type TConfirmUploadResponse,
} from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TConfirmUploadResponse): TConfirmUploadResponse {
  return data;
}

export type TConfirmUploadControllerOutput = ReturnType<typeof presenter>;

/**
 * Confirm that the client has finished uploading bytes.
 *
 * @param input - Raw payload containing projectId and fileId.
 * @returns Updated file id and status.
 * @throws InputParseError if params fail schema validation.
 */
export async function confirmUploadController(
  input: unknown,
): Promise<TConfirmUploadControllerOutput> {
  const parsed = await ConfirmUploadSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await confirmUploadUseCase(parsed.data.projectId, parsed.data.fileId);
  return presenter(data);
}
