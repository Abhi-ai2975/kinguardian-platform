/**
 * listPractitionerTelecomController — validates input and invokes the list-telecom use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { type TPractitionerTelecomListResponse } from "@/modules/entities/schemas/practitioner";
import { listPractitionerTelecomUseCase } from "../../application/usecases/listPractitionerTelecom.usecase";

const InputSchema = z.object({ practitionerId: z.number().int().positive() });

function presenter(data: TPractitionerTelecomListResponse) {
  return data;
}

export type TListPractitionerTelecomControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { practitionerId } and lists all telecom records for that Practitioner.
 *
 * @param input - Raw unknown value.
 * @returns List response.
 * @throws InputParseError on schema validation failure.
 */
export async function listPractitionerTelecomController(
  input: unknown,
): Promise<TListPractitionerTelecomControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPractitionerTelecomUseCase(parsed.data.practitionerId);
  return presenter(data);
}
