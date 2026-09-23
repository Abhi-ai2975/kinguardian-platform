/**
 * lookupBatchUseCase — bulk concept lookup in a single round-trip.
 *
 * Layer: server / core / terminology / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  TLookupBatch,
  TLookupBatchResponse,
} from "@/modules/entities/schemas/terminology/terminology.schema";

/**
 * Resolves up to 100 system+code pairs in one request.
 * Results are returned in the same order as the input items.
 *
 * @param query - List of system+code pairs.
 * @returns One LookupResult per input item, in input order.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
 */
export async function lookupBatchUseCase(
  query: TLookupBatch,
): Promise<TLookupBatchResponse> {
  const service = getInjection("ITerminologyService");
  return service.lookupBatch(query);
}
