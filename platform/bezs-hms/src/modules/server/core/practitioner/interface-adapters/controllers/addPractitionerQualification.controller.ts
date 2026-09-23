/**
 * addPractitionerQualificationController — validates input and invokes the add-qualification use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { z } from "zod";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  AddPractitionerQualificationSchema,
  type TPractitionerQualificationResponse,
} from "@/modules/entities/schemas/practitioner";
import { addPractitionerQualificationUseCase } from "../../application/usecases/addPractitionerQualification.usecase";

const InputSchema = z
  .object({ practitionerId: z.number().int().positive() })
  .merge(AddPractitionerQualificationSchema);

function presenter(data: TPractitionerQualificationResponse) {
  return data;
}

export type TAddPractitionerQualificationControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses practitionerId + qualification DTO, delegates to addPractitionerQualificationUseCase.
 * The DTO may include a nested identifier array.
 *
 * @param input - Raw unknown value.
 * @returns The created qualification record.
 * @throws InputParseError on schema validation failure.
 */
export async function addPractitionerQualificationController(
  input: unknown,
): Promise<TAddPractitionerQualificationControllerOutput> {
  const parsed = await InputSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { practitionerId, ...dto } = parsed.data;
  const data = await addPractitionerQualificationUseCase(practitionerId, dto);
  return presenter(data);
}
