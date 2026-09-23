/**
 * listPractitionerRolesController — validates input and invokes the list use case.
 *
 * Layer: server / core / practitioner-role / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListPractitionerRolesValidationSchema,
  type TPaginatedPractitionerRoleResponse,
} from "@/modules/entities/schemas/practitioner-role";
import { listPractitionerRolesUseCase } from "../../application/usecases/listPractitionerRoles.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPaginatedPractitionerRoleResponse) {
  return data;
}

export type TListPractitionerRolesControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to listPractitionerRolesUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (query params).
 * @returns Paginated list of PractitionerRoles.
 * @throws InputParseError on schema validation failure.
 */
export async function listPractitionerRolesController(
  input: unknown,
): Promise<TListPractitionerRolesControllerOutput> {
  const parsed = await ListPractitionerRolesValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listPractitionerRolesUseCase(parsed.data);
  return presenter(data);
}
