/**
 * updatePractitionerRoleController — validates input and invokes the update use case.
 *
 * Layer: server / core / practitioner-role / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  UpdatePractitionerRoleValidationSchema,
  type TPractitionerRoleResponse,
} from "@/modules/entities/schemas/practitioner-role";
import { updatePractitionerRoleUseCase } from "../../application/usecases/updatePractitionerRole.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPractitionerRoleResponse) {
  return data;
}

export type TUpdatePractitionerRoleControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, splits id from patch body, delegates to updatePractitionerRoleUseCase.
 *
 * @param input - Raw unknown value from the server action (must contain { id, ...patchFields }).
 * @returns The updated PractitionerRole resource.
 * @throws InputParseError on schema validation failure.
 */
export async function updatePractitionerRoleController(
  input: unknown,
): Promise<TUpdatePractitionerRoleControllerOutput> {
  const parsed = await UpdatePractitionerRoleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updatePractitionerRoleUseCase(id, dto);
  return presenter(data);
}
