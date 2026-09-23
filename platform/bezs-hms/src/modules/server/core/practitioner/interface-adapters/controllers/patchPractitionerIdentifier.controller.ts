/**
 * patchPractitionerIdentifierController — validates input and invokes the patch-identifier use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  PatchPractitionerIdentifierValidationSchema,
  type TPractitionerIdentifierResponse,
} from "@/modules/entities/schemas/practitioner";
import { patchPractitionerIdentifierUseCase } from "../../application/usecases/patchPractitionerIdentifier.usecase";

function presenter(data: TPractitionerIdentifierResponse) {
  return data;
}

export type TPatchPractitionerIdentifierControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId, identifierId, ...dto } and delegates to patchPractitionerIdentifierUseCase.
 *
 * @param input - Raw unknown value.
 * @returns The updated identifier record.
 * @throws InputParseError on schema validation failure.
 */
export async function patchPractitionerIdentifierController(
  input: unknown,
): Promise<TPatchPractitionerIdentifierControllerOutput> {
  const parsed = await PatchPractitionerIdentifierValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, identifierId, ...dto } = parsed.data;
  const data = await patchPractitionerIdentifierUseCase(practitionerId, identifierId, dto);
  return presenter(data);
}
