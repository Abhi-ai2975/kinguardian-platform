/**
 * listPractitionerCommunicationsController — validates input and invokes the list-communications use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { type TPractitionerCommunicationListResponse } from "@/modules/entities/schemas/practitioner";
import { listPractitionerCommunicationsUseCase } from "../../application/usecases/listPractitionerCommunications.usecase";

const InputSchema = z.object({ practitionerId: z.number().int().positive() });

function presenter(data: TPractitionerCommunicationListResponse) {
  return data;
}

export type TListPractitionerCommunicationsControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId } and lists all communications for that Practitioner.
 *
 * @param input - Raw unknown value.
 * @returns List response.
 * @throws InputParseError on schema validation failure.
 */
export async function listPractitionerCommunicationsController(
  input: unknown,
): Promise<TListPractitionerCommunicationsControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPractitionerCommunicationsUseCase(parsed.data.practitionerId);
  return presenter(data);
}
