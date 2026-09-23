/**
 * deletePractitionerRoleController — validates input and invokes the delete use case.
 *
 * Layer: server / core / practitioner-role / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeletePractitionerRoleValidationSchema } from "@/modules/entities/schemas/practitioner-role";
import { deletePractitionerRoleUseCase } from "../../application/usecases/deletePractitionerRole.usecase";

/**
 * Parses the raw input and delegates to deletePractitionerRoleUseCase.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @throws InputParseError on schema validation failure.
 */
export async function deletePractitionerRoleController(input: unknown): Promise<void> {
  const parsed = await DeletePractitionerRoleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePractitionerRoleUseCase(parsed.data.id);
}
