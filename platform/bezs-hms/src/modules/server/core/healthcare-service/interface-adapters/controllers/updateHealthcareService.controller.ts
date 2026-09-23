/**
 * updateHealthcareServiceController — interface adapter for partially updating a HealthcareService.
 *
 * Layer: interface-adapters / controllers
 * Operation: update (PATCH — scalar + photo fields only, see PatchHealthcareServiceDtoSchema)
 *
 * Splits id from the dto before passing to the use case, matching the service
 * interface signature update(id, dto).
 */

import {
  PatchHealthcareServiceDtoSchema,
  PatchHealthcareServiceValidationSchema,
  THealthcareServiceResponse,
} from "@/modules/entities/schemas/healthcare-service";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateHealthcareServiceUseCase } from "../../application/usecases/updateHealthcareService.usecase";

function presenter(data: THealthcareServiceResponse) {
  return data;
}

export type TUpdateHealthcareServiceControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload and applies the update.
 *
 * @param input - Raw payload: `{ id: number, ...patchable scalar fields }`.
 * @returns The updated healthcare service record.
 * @throws InputParseError | ValidationError | NotFoundError
 */
export async function updateHealthcareServiceController(
  input: unknown
): Promise<TUpdateHealthcareServiceControllerOutput> {
  const parsed = await PatchHealthcareServiceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const { id, ...dto } = parsed.data;
  const dtoParsed = await PatchHealthcareServiceDtoSchema.safeParseAsync(dto);
  if (!dtoParsed.success) throw new InputParseError(dtoParsed.error);

  const data = await updateHealthcareServiceUseCase(id, dtoParsed.data);
  return presenter(data);
}
