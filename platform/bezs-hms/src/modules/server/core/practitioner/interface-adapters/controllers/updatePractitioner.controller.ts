/**
 * updatePractitionerController — validates input and invokes the update use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  UpdatePractitionerValidationSchema,
  type TPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";
import { updatePractitionerUseCase } from "../../application/usecases/updatePractitioner.usecase";

function presenter(data: TPractitionerResponse) {
  return data;
}

export type TUpdatePractitionerControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { id, ...dto } and delegates to updatePractitionerUseCase.
 *
 * @param input - Raw unknown value containing id + patchable fields.
 * @returns The updated Practitioner resource.
 * @throws InputParseError on schema validation failure.
 */
export async function updatePractitionerController(
  input: unknown,
): Promise<TUpdatePractitionerControllerOutput> {
  const parsed = await UpdatePractitionerValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updatePractitionerUseCase(id, dto);
  return presenter(data);
}
