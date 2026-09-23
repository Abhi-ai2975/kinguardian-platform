/**
 * registerOrganizationController — interface adapter for creating an Organization.
 *
 * Layer: interface-adapters / controllers
 * Operation: register (create)
 *
 * Validates the raw input against RegisterOrgValidationSchema, calls the use case,
 * and passes the result through the presenter. Throws InputParseError on invalid input.
 */

import {
  RegisterOrgValidationSchema,
  TOrgResponse,
} from "@/modules/entities/schemas/organization";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { registerOrganizationUseCase } from "../../application/usecases/registerOrganization.usecase";

/** Pass-through presenter — returns the org record as-is for now. */
function presenter(data: TOrgResponse) {
  return data;
}

export type TRegisterOrganizationControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates and executes an organization registration.
 *
 * @param input - Raw (unknown) payload from the server action.
 * @returns The created organization record.
 * @throws InputParseError on Zod validation failure.
 */
export async function registerOrganizationController(
  input: unknown
): Promise<TRegisterOrganizationControllerOutput> {
  const parsed = await RegisterOrgValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await registerOrganizationUseCase(parsed.data);
  return presenter(data);
}
