/**
 * searchUseCase — full-text search across all loaded terminology concepts.
 *
 * Layer: server / core / terminology / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import { TSearch, TSearchResponse } from "@/modules/entities/schemas/terminology/terminology.schema";

/**
 * Searches terminology concepts by trigram similarity to the query string.
 *
 * @param query - Search query, optional system filter, and pagination.
 * @returns Paginated list of matching concepts.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
 */
export async function searchUseCase(query: TSearch): Promise<TSearchResponse> {
  const service = getInjection("ITerminologyService");
  return service.search(query);
}
