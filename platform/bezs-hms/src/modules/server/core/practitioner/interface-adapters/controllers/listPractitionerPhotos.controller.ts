/**
 * listPractitionerPhotosController — validates input and invokes the list-photos use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { type TPractitionerPhotoListResponse } from "@/modules/entities/schemas/practitioner";
import { listPractitionerPhotosUseCase } from "../../application/usecases/listPractitionerPhotos.usecase";

const InputSchema = z.object({ practitionerId: z.number().int().positive() });

function presenter(data: TPractitionerPhotoListResponse) {
  return data;
}

export type TListPractitionerPhotosControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId } and lists all photos for that Practitioner.
 *
 * @param input - Raw unknown value.
 * @returns List response.
 * @throws InputParseError on schema validation failure.
 */
export async function listPractitionerPhotosController(
  input: unknown,
): Promise<TListPractitionerPhotosControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPractitionerPhotosUseCase(parsed.data.practitionerId);
  return presenter(data);
}
