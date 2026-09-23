/**
 * patchPractitionerNameController — validates input and invokes the patch-name use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  PatchPractitionerNameValidationSchema,
  type TPractitionerNameResponse,
} from "@/modules/entities/schemas/practitioner";
import { patchPractitionerNameUseCase } from "../../application/usecases/patchPractitionerName.usecase";

function presenter(data: TPractitionerNameResponse) {
  return data;
}

export type TPatchPractitionerNameControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId, nameId, ...dto } and delegates to patchPractitionerNameUseCase.
 *
 * @param input - Raw unknown value.
 * @returns The updated name record.
 * @throws InputParseError on schema validation failure.
 */
export async function patchPractitionerNameController(
  input: unknown,
): Promise<TPatchPractitionerNameControllerOutput> {
  const parsed = await PatchPractitionerNameValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, nameId, ...dto } = parsed.data;
  const data = await patchPractitionerNameUseCase(practitionerId, nameId, dto);
  return presenter(data);
}
