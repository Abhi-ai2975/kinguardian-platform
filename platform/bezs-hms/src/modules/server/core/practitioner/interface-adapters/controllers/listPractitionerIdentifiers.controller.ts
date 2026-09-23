/**
 * listPractitionerIdentifiersController — validates input and invokes the list-identifiers use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { type TPractitionerIdentifierListResponse } from "@/modules/entities/schemas/practitioner";
import { listPractitionerIdentifiersUseCase } from "../../application/usecases/listPractitionerIdentifiers.usecase";

const InputSchema = z.object({ practitionerId: z.number().int().positive() });

function presenter(data: TPractitionerIdentifierListResponse) {
  return data;
}

export type TListPractitionerIdentifiersControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId } and lists all identifiers for that Practitioner.
 *
 * @param input - Raw unknown value.
 * @returns List response.
 * @throws InputParseError on schema validation failure.
 */
export async function listPractitionerIdentifiersController(
  input: unknown,
): Promise<TListPractitionerIdentifiersControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPractitionerIdentifiersUseCase(parsed.data.practitionerId);
  return presenter(data);
}
