/**
 * addPractitionerCommunicationController — validates input and invokes the add-communication use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  AddPractitionerCommunicationSchema,
  type TPractitionerCommunicationResponse,
} from "@/modules/entities/schemas/practitioner";
import { addPractitionerCommunicationUseCase } from "../../application/usecases/addPractitionerCommunication.usecase";

const InputSchema = z
  .object({ practitionerId: z.number().int().positive() })
  .merge(AddPractitionerCommunicationSchema);

function presenter(data: TPractitionerCommunicationResponse) {
  return data;
}

export type TAddPractitionerCommunicationControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses practitionerId + communication DTO, delegates to addPractitionerCommunicationUseCase.
 *
 * @param input - Raw unknown value.
 * @returns The created communication record.
 * @throws InputParseError on schema validation failure.
 */
export async function addPractitionerCommunicationController(
  input: unknown,
): Promise<TAddPractitionerCommunicationControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, ...dto } = parsed.data;
  const data = await addPractitionerCommunicationUseCase(practitionerId, dto);
  return presenter(data);
}
