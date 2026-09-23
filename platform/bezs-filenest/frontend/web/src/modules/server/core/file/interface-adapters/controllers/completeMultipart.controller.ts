/**
 * completeMultipart.controller — validates completion input and assembles multipart object.
 *
 * Layer: core / file / interface-adapters / controllers
 *
 * @module
 */
"server-only";

import { completeMultipartUseCase } from "../../application/usecases/completeMultipart.usecase";
import {
  CompleteMultipartSchema,
  type TMultipartCompleteResponse,
} from "@/modules/entities/schemas/file";
import { InputParseError } from "@/modules/server/shared/errors/schema-parse-error";

function presenter(data: TMultipartCompleteResponse): TMultipartCompleteResponse {
  return data;
}

export type TCompleteMultipartControllerOutput = ReturnType<typeof presenter>;

/**
 * Assemble all uploaded parts and trigger the processing pipeline.
 *
 * @param input - Raw payload with projectId, uploadId, and parts array.
 * @returns file_id and final status.
 * @throws InputParseError if params fail schema validation.
 */
export async function completeMultipartController(
  input: unknown,
): Promise<TCompleteMultipartControllerOutput> {
  const parsed = await CompleteMultipartSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await completeMultipartUseCase(parsed.data);
  return presenter(data);
}
