/**
 * addPractitionerNameController — validates input and invokes the add-name use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  AddPractitionerNameSchema,
  type TPractitionerNameResponse,
} from "@/modules/entities/schemas/practitioner";
import { addPractitionerNameUseCase } from "../../application/usecases/addPractitionerName.usecase";

/** Inline composite schema: practitionerId + all name fields. */
const InputSchema = z
  .object({ practitionerId: z.number().int().positive() })
  .merge(AddPractitionerNameSchema);

function presenter(data: TPractitionerNameResponse) {
  return data;
}

export type TAddPractitionerNameControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses practitionerId and name DTO, delegates to addPractitionerNameUseCase.
 *
 * @param input - Raw unknown value.
 * @returns The created name record.
 * @throws InputParseError on schema validation failure.
 */
export async function addPractitionerNameController(
  input: unknown,
): Promise<TAddPractitionerNameControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, ...dto } = parsed.data;
  const data = await addPractitionerNameUseCase(practitionerId, dto);
  return presenter(data);
}
