/**
 * getPractitionerByIdController — validates id input and invokes the getById use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetByIdPractitionerValidationSchema,
  type TPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";
import { getPractitionerByIdUseCase } from "../../application/usecases/getPractitionerById.usecase";

function presenter(data: TPractitionerResponse) {
  return data;
}

export type TGetPractitionerByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses { id } and delegates to getPractitionerByIdUseCase.
 *
 * @param input - Raw unknown value containing { id: number }.
 * @returns The Practitioner resource.
 * @throws InputParseError on schema validation failure.
 */
export async function getPractitionerByIdController(
  input: unknown,
): Promise<TGetPractitionerByIdControllerOutput> {
  const parsed = await GetByIdPractitionerValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getPractitionerByIdUseCase(parsed.data.id);
  return presenter(data);
}
