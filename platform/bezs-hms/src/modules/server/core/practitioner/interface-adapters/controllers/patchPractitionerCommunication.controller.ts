/**
 * patchPractitionerCommunicationController — validates input and invokes the patch-communication use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  PatchPractitionerCommunicationValidationSchema,
  type TPractitionerCommunicationResponse,
} from "@/modules/entities/schemas/practitioner";
import { patchPractitionerCommunicationUseCase } from "../../application/usecases/patchPractitionerCommunication.usecase";

function presenter(data: TPractitionerCommunicationResponse) {
  return data;
}

export type TPatchPractitionerCommunicationControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId, communicationId, ...dto } and delegates.
 *
 * @param input - Raw unknown value.
 * @returns The updated communication record.
 * @throws InputParseError on schema validation failure.
 */
export async function patchPractitionerCommunicationController(
  input: unknown,
): Promise<TPatchPractitionerCommunicationControllerOutput> {
  const parsed = await PatchPractitionerCommunicationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, communicationId, ...dto } = parsed.data;
  const data = await patchPractitionerCommunicationUseCase(practitionerId, communicationId, dto);
  return presenter(data);
}
