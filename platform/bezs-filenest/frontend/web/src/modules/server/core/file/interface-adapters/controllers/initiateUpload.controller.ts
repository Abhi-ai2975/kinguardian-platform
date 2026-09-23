/**
 * initiateUpload.controller — validates initiation input and returns presigned URL.
 *
 * Layer: core / file / interface-adapters / controllers
 *
 * @module
 */
"server-only";

import { initiateUploadUseCase } from "../../application/usecases/initiateUpload.usecase";
import {
  InitiateUploadSchema,
  type TUploadInitResponse,
} from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TUploadInitResponse): TUploadInitResponse {
  return data;
}

export type TInitiateUploadControllerOutput = ReturnType<typeof presenter>;

/**
 * Validate upload initiation params and return a presigned PUT URL.
 *
 * @param input - Raw payload from the ZSA action.
 * @returns file_id, upload_url, and expires_at.
 * @throws InputParseError if params fail schema validation.
 */
export async function initiateUploadController(
  input: unknown,
): Promise<TInitiateUploadControllerOutput> {
  const parsed = await InitiateUploadSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await initiateUploadUseCase(parsed.data);
  return presenter(data);
}
