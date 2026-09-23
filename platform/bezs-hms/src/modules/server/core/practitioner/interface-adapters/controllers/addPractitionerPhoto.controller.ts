/**
 * addPractitionerPhotoController — validates input and invokes the add-photo use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  AddPractitionerPhotoSchema,
  type TPractitionerPhotoResponse,
} from "@/modules/entities/schemas/practitioner";
import { addPractitionerPhotoUseCase } from "../../application/usecases/addPractitionerPhoto.usecase";

const InputSchema = z
  .object({ practitionerId: z.number().int().positive() })
  .merge(AddPractitionerPhotoSchema);

function presenter(data: TPractitionerPhotoResponse) {
  return data;
}

export type TAddPractitionerPhotoControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses practitionerId + photo DTO, delegates to addPractitionerPhotoUseCase.
 *
 * @param input - Raw unknown value.
 * @returns The created photo record.
 * @throws InputParseError on schema validation failure.
 */
export async function addPractitionerPhotoController(
  input: unknown,
): Promise<TAddPractitionerPhotoControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, ...dto } = parsed.data;
  const data = await addPractitionerPhotoUseCase(practitionerId, dto);
  return presenter(data);
}
