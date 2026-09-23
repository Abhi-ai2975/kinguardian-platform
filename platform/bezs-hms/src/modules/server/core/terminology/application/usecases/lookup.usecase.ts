/**
 * lookupUseCase — looks up a single terminology concept by system+code.
 *
 * Layer: server / core / terminology / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import { TLookup, TLookupResult } from "@/modules/entities/schemas/terminology/terminology.schema";

/**
 * Looks up a single concept by its canonical system URL and code.
 * Returns `found: false` when the code does not exist — no exception thrown.
 *
 * @param query - The system URL and code to look up.
 * @returns Lookup result with found flag and optional concept details.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
 */
export async function lookupUseCase(query: TLookup): Promise<TLookupResult> {
  const service = getInjection("ITerminologyService");
  return service.lookup(query);
}
