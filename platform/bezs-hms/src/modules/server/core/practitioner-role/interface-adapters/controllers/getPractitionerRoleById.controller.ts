/**
 * getPractitionerRoleByIdController — validates input and invokes the getById use case.
 *
 * Layer: server / core / practitioner-role / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetByIdPractitionerRoleValidationSchema,
  type TPractitionerRoleResponse,
} from "@/modules/entities/schemas/practitioner-role";
import { getPractitionerRoleByIdUseCase } from "../../application/usecases/getPractitionerRoleById.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPractitionerRoleResponse) {
  return data;
}

export type TGetPractitionerRoleByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to getPractitionerRoleByIdUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @returns The PractitionerRole resource with all embedded child arrays.
 * @throws InputParseError on schema validation failure.
 */
export async function getPractitionerRoleByIdController(
  input: unknown,
): Promise<TGetPractitionerRoleByIdControllerOutput> {
  const parsed = await GetByIdPractitionerRoleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getPractitionerRoleByIdUseCase(parsed.data.id);
  return presenter(data);
}
