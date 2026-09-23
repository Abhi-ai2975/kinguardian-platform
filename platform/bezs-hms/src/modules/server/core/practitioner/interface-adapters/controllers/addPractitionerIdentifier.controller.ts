/**
 * addPractitionerIdentifierController — validates input and invokes the add-identifier use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  AddPractitionerIdentifierSchema,
  type TPractitionerIdentifierResponse,
} from "@/modules/entities/schemas/practitioner";
import { addPractitionerIdentifierUseCase } from "../../application/usecases/addPractitionerIdentifier.usecase";

const InputSchema = z
  .object({ practitionerId: z.number().int().positive() })
  .merge(AddPractitionerIdentifierSchema);

function presenter(data: TPractitionerIdentifierResponse) {
  return data;
}

export type TAddPractitionerIdentifierControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses practitionerId + identifier DTO, delegates to addPractitionerIdentifierUseCase.
 *
 * @param input - Raw unknown value.
 * @returns The created identifier record.
 * @throws InputParseError on schema validation failure.
 */
export async function addPractitionerIdentifierController(
  input: unknown,
): Promise<TAddPractitionerIdentifierControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, ...dto } = parsed.data;
  const data = await addPractitionerIdentifierUseCase(practitionerId, dto);
  return presenter(data);
}
