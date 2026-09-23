/**
 * patchPractitionerPhotoController — validates input and invokes the patch-photo use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  PatchPractitionerPhotoValidationSchema,
  type TPractitionerPhotoResponse,
} from "@/modules/entities/schemas/practitioner";
import { patchPractitionerPhotoUseCase } from "../../application/usecases/patchPractitionerPhoto.usecase";

function presenter(data: TPractitionerPhotoResponse) {
  return data;
}

export type TPatchPractitionerPhotoControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId, photoId, ...dto } and delegates to patchPractitionerPhotoUseCase.
 *
 * @param input - Raw unknown value.
 * @returns The updated photo record.
 * @throws InputParseError on schema validation failure.
 */
export async function patchPractitionerPhotoController(
  input: unknown,
): Promise<TPatchPractitionerPhotoControllerOutput> {
  const parsed = await PatchPractitionerPhotoValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, photoId, ...dto } = parsed.data;
  const data = await patchPractitionerPhotoUseCase(practitionerId, photoId, dto);
  return presenter(data);
}
