/**
 * deleteHealthcareServiceController — interface adapter for deleting a HealthcareService.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete (irreversible — 204 No Content from fhir-gql)
 */

import { DeleteHealthcareServiceValidationSchema } from "@/modules/entities/schemas/healthcare-service";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteHealthcareServiceUseCase } from "../../application/usecases/deleteHealthcareService.usecase";

export type TDeleteHealthcareServiceControllerOutput = void;

/**
 * Validates the id and deletes the healthcare service.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteHealthcareServiceController(
  input: unknown
): Promise<TDeleteHealthcareServiceControllerOutput> {
  const parsed = await DeleteHealthcareServiceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteHealthcareServiceUseCase(parsed.data.id);
}
