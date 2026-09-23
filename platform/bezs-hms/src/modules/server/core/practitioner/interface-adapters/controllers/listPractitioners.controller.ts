/**
 * listPractitionersController — validates input and invokes the list use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListPractitionersValidationSchema,
  type TPaginatedPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";
import { listPractitionersUseCase } from "../../application/usecases/listPractitioners.usecase";

function presenter(data: TPaginatedPractitionerResponse) {
  return data;
}

export type TListPractitionersControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw query input and delegates to listPractitionersUseCase.
 *
 * @param input - Raw unknown value (may be undefined for default list).
 * @returns Paginated list of Practitioners.
 * @throws InputParseError on schema validation failure.
 */
export async function listPractitionersController(
  input: unknown,
): Promise<TListPractitionersControllerOutput> {
  const parsed = await ListPractitionersValidationSchema.optional().safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPractitionersUseCase(parsed.data);
  return presenter(data);
}
