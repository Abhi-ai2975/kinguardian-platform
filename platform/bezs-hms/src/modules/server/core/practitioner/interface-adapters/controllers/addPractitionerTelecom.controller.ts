/**
 * addPractitionerTelecomController — validates input and invokes the add-telecom use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  AddPractitionerTelecomSchema,
  type TPractitionerTelecomResponse,
} from "@/modules/entities/schemas/practitioner";
import { addPractitionerTelecomUseCase } from "../../application/usecases/addPractitionerTelecom.usecase";

const InputSchema = z
  .object({ practitionerId: z.number().int().positive() })
  .merge(AddPractitionerTelecomSchema);

function presenter(data: TPractitionerTelecomResponse) {
  return data;
}

export type TAddPractitionerTelecomControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses practitionerId + telecom DTO, delegates to addPractitionerTelecomUseCase.
 *
 * @param input - Raw unknown value.
 * @returns The created telecom record.
 * @throws InputParseError on schema validation failure.
 */
export async function addPractitionerTelecomController(
  input: unknown,
): Promise<TAddPractitionerTelecomControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, ...dto } = parsed.data;
  const data = await addPractitionerTelecomUseCase(practitionerId, dto);
  return presenter(data);
}
