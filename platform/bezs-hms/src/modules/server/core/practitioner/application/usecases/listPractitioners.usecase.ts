/**
 * listPractitionersUseCase — returns a paginated list of Practitioner resources.
 *
 * Layer: server / core / practitioner / application / usecases
 *
 * Delegates to IPractitionersService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TListPractitionersQuery,
  type TPaginatedPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Lists Practitioners with optional filter and pagination params.
 *
 * @param query - Optional filter/pagination validated by ListPractitionersValidationSchema.
 * @returns Paginated list of Practitioners.
 */
export async function listPractitionersUseCase(
  query?: TListPractitionersQuery,
): Promise<TPaginatedPractitionerResponse> {
  const service = getInjection("IPractitionersService");
  return service.list(query);
}
