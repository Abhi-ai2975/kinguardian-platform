/**
 * createPractitionerRoleController — validates input and invokes the create use case.
 *
 * Layer: server / core / practitioner-role / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreatePractitionerRoleValidationSchema,
  type TPractitionerRoleResponse,
} from "@/modules/entities/schemas/practitioner-role";
import { createPractitionerRoleUseCase } from "../../application/usecases/createPractitionerRole.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPractitionerRoleResponse) {
  return data;
}

export type TCreatePractitionerRoleControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to createPractitionerRoleUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The created PractitionerRole resource.
 * @throws InputParseError on schema validation failure.
 */
export async function createPractitionerRoleController(
  input: unknown,
): Promise<TCreatePractitionerRoleControllerOutput> {
  const parsed = await CreatePractitionerRoleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createPractitionerRoleUseCase(parsed.data);
  return presenter(data);
}
