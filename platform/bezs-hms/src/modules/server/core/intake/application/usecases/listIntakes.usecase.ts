/**
 * listIntakesUseCase — paginated list of all AI Intake records.
 *
 * Layer: server / core / intake / application / usecases
 *
 * Delegates directly to IIntakeRepository (no service layer — intake uses
 * the repository directly, unlike FHIR resources that have service wrappers).
 */

import { getInjection } from "@/modules/server/di/container";
import type {
  TListIntakesQuery,
  TPaginatedIntakeResponse,
} from "@/modules/entities/schemas/intake";

/**
 * Returns a paginated list of Intake records with optional filters.
 *
 * @param query - Optional filters (user_id, org_id, status, mode, limit, offset).
 * @returns Paginated intake list.
 */
export async function listIntakesUseCase(
  query?: TListIntakesQuery,
): Promise<TPaginatedIntakeResponse> {
  return getInjection("IIntakeRepository").list(query ?? {});
}
