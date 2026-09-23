/**
 * abortMultipart.controller — validates abort input and discards multipart parts.
 *
 * Layer: core / file / interface-adapters / controllers
 *
 * @module
 */
"server-only";

import { abortMultipartUseCase } from "../../application/usecases/abortMultipart.usecase";
import {
  AbortMultipartSchema,
  type TMultipartAbortResponse,
} from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TMultipartAbortResponse): TMultipartAbortResponse {
  return data;
}

export type TAbortMultipartControllerOutput = ReturnType<typeof presenter>;

/**
 * Abort a multipart upload and discard all uploaded parts.
 *
 * @param input - Raw payload with projectId and uploadId.
 * @returns Confirmation with aborted: true.
 * @throws InputParseError if params fail schema validation.
 */
export async function abortMultipartController(
  input: unknown,
): Promise<TAbortMultipartControllerOutput> {
  const parsed = await AbortMultipartSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await abortMultipartUseCase(parsed.data);
  return presenter(data);
}
