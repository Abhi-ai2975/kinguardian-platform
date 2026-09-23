/**
 * initiateMultipart.controller — validates multipart start input.
 *
 * Layer: core / file / interface-adapters / controllers
 *
 * @module
 */
"server-only";

import { initiateMultipartUseCase } from "../../application/usecases/initiateMultipart.usecase";
import {
  InitiateMultipartSchema,
  type TMultipartStartResponse,
} from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TMultipartStartResponse): TMultipartStartResponse {
  return data;
}

export type TInitiateMultipartControllerOutput = ReturnType<typeof presenter>;

/**
 * Start a multipart upload session for large files.
 *
 * @param input - Raw payload with projectId, filename, content_type, total_size_bytes.
 * @returns upload_id and file_id.
 * @throws InputParseError if params fail schema validation.
 */
export async function initiateMultipartController(
  input: unknown,
): Promise<TInitiateMultipartControllerOutput> {
  const parsed = await InitiateMultipartSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await initiateMultipartUseCase(parsed.data);
  return presenter(data);
}
