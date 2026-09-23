/**
 * patchPractitionerTelecomController — validates input and invokes the patch-telecom use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  PatchPractitionerTelecomValidationSchema,
  type TPractitionerTelecomResponse,
} from "@/modules/entities/schemas/practitioner";
import { patchPractitionerTelecomUseCase } from "../../application/usecases/patchPractitionerTelecom.usecase";

function presenter(data: TPractitionerTelecomResponse) {
  return data;
}

export type TPatchPractitionerTelecomControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId, telecomId, ...dto } and delegates to patchPractitionerTelecomUseCase.
 *
 * @param input - Raw unknown value.
 * @returns The updated telecom record.
 * @throws InputParseError on schema validation failure.
 */
export async function patchPractitionerTelecomController(
  input: unknown,
): Promise<TPatchPractitionerTelecomControllerOutput> {
  const parsed = await PatchPractitionerTelecomValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, telecomId, ...dto } = parsed.data;
  const data = await patchPractitionerTelecomUseCase(practitionerId, telecomId, dto);
  return presenter(data);
}
