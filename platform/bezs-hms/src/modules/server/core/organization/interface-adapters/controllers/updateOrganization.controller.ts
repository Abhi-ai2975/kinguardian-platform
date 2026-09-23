/**
 * updateOrganizationController — interface adapter for partially updating an Organization.
 *
 * Layer: interface-adapters / controllers
 * Operation: update (PATCH — only name, active, partof_display are patchable)
 *
 * Splits id from the dto before passing to the use case, matching the service
 * interface signature update(id, dto).
 */

import {
  PatchOrgDtoSchema,
  PatchOrgValidationSchema,
  TOrgResponse,
} from "@/modules/entities/schemas/organization";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateOrganizationUseCase } from "../../application/usecases/updateOrganization.usecase";

function presenter(data: TOrgResponse) {
  return data;
}

export type TUpdateOrganizationControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload and applies the update.
 *
 * @param input - Raw payload: `{ id: number, active?, name?, partof_display? }`.
 * @returns The updated organization record.
 * @throws InputParseError | ValidationError | NotFoundError
 */
export async function updateOrganizationController(
  input: unknown
): Promise<TUpdateOrganizationControllerOutput> {
  const parsed = await PatchOrgValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const { id, ...dto } = parsed.data;
  // Validate the dto portion independently so the error message is precise.
  const dtoParsed = await PatchOrgDtoSchema.safeParseAsync(dto);
  if (!dtoParsed.success) throw new InputParseError(dtoParsed.error);

  const data = await updateOrganizationUseCase(id, dtoParsed.data);
  return presenter(data);
}
