/**
 * listPractitionerNamesController — validates practitionerId and invokes the list-names use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { type TPractitionerNameListResponse } from "@/modules/entities/schemas/practitioner";
import { listPractitionerNamesUseCase } from "../../application/usecases/listPractitionerNames.usecase";

const InputSchema = z.object({ practitionerId: z.number().int().positive() });

function presenter(data: TPractitionerNameListResponse) {
  return data;
}

export type TListPractitionerNamesControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId } and lists all names for that Practitioner.
 *
 * @param input - Raw unknown value.
 * @returns List response.
 * @throws InputParseError on schema validation failure.
 */
export async function listPractitionerNamesController(
  input: unknown,
): Promise<TListPractitionerNamesControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPractitionerNamesUseCase(parsed.data.practitionerId);
  return presenter(data);
}
