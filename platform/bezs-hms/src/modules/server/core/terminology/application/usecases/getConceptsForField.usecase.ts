/**
 * getConceptsForFieldUseCase — fetches value-set concepts for a FHIR resource field.
 *
 * Layer: server / core / terminology / application / usecases
 *
 * Delegates to ITerminologyService via DI — transport-agnostic (REST or GraphQL
 * depending on what is bound in the DI module at startup).
 */

import { getInjection } from "@/modules/server/di/container";
import {
  TConceptsForFieldResponse,
  TGetConceptsForField,
} from "@/modules/entities/schemas/terminology/terminology.schema";

/**
 * Fetches value-set concepts bound to a specific field on a FHIR resource.
 *
 * @param query - Resource, field, and optional filter/pagination params.
 * @returns Paginated list of concepts valid for the requested field.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError | BadGatewayError
 */
export async function getConceptsForFieldUseCase(
  query: TGetConceptsForField,
): Promise<TConceptsForFieldResponse> {
  const service = getInjection("ITerminologyService");
  return service.getConceptsForField(query);
}
