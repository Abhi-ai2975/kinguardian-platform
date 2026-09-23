/**
 * addPractitionerAddressController — validates input and invokes the add-address use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  AddPractitionerAddressSchema,
  type TPractitionerAddressResponse,
} from "@/modules/entities/schemas/practitioner";
import { addPractitionerAddressUseCase } from "../../application/usecases/addPractitionerAddress.usecase";

const InputSchema = z
  .object({ practitionerId: z.number().int().positive() })
  .merge(AddPractitionerAddressSchema);

function presenter(data: TPractitionerAddressResponse) {
  return data;
}

export type TAddPractitionerAddressControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses practitionerId + address DTO, delegates to addPractitionerAddressUseCase.
 *
 * @param input - Raw unknown value.
 * @returns The created address record.
 * @throws InputParseError on schema validation failure.
 */
export async function addPractitionerAddressController(
  input: unknown,
): Promise<TAddPractitionerAddressControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, ...dto } = parsed.data;
  const data = await addPractitionerAddressUseCase(practitionerId, dto);
  return presenter(data);
}
