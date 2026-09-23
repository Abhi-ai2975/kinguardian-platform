/**
 * patchPractitionerQualificationController — validates input and invokes the patch-qualification use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  PatchPractitionerQualificationValidationSchema,
  type TPractitionerQualificationResponse,
} from "@/modules/entities/schemas/practitioner";
import { patchPractitionerQualificationUseCase } from "../../application/usecases/patchPractitionerQualification.usecase";

function presenter(data: TPractitionerQualificationResponse) {
  return data;
}

export type TPatchPractitionerQualificationControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId, qualificationId, ...dto } and delegates.
 * If identifier array is present it fully replaces the existing identifiers.
 *
 * @param input - Raw unknown value.
 * @returns The updated qualification record.
 * @throws InputParseError on schema validation failure.
 */
export async function patchPractitionerQualificationController(
  input: unknown,
): Promise<TPatchPractitionerQualificationControllerOutput> {
  const parsed = await PatchPractitionerQualificationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, qualificationId, ...dto } = parsed.data;
  const data = await patchPractitionerQualificationUseCase(practitionerId, qualificationId, dto);
  return presenter(data);
}
