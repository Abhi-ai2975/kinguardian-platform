/**
 * validateUseCase — validates a code against a FHIR resource field binding.
 *
 * Layer: server / core / terminology / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  TValidate,
  TValidateResponse,
} from "@/modules/entities/schemas/terminology/terminology.schema";

/**
 * Checks whether a given system+code is acceptable for the specified FHIR field.
 * Respects binding strength — extensible bindings tolerate codes outside the value set.
 *
 * @param query - Resource, field, system, and code to validate.
 * @returns Validation result: valid flag, in_value_set flag, and explanatory message.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError | BadGatewayError
 */
export async function validateUseCase(query: TValidate): Promise<TValidateResponse> {
  const service = getInjection("ITerminologyService");
  return service.validate(query);
}
