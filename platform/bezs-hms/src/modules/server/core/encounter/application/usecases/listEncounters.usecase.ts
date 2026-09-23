/**
 * listEncounters use case.
 *
 * Layer: server / core / encounter / application / usecases
 *
 * Resolves the IEncounterService from DI and delegates the paginated list call.
 * All filters are optional — the service falls back to caller-visible encounters.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TListEncountersQuery,
  type TPaginatedEncounterResponse,
} from "@/modules/entities/schemas/encounter";

/**
 * Lists Encounters with optional filters and pagination.
 *
 * @param query - Optional filter params (status, patient_id, appointment_id, date range, limit, offset).
 * @returns Paginated encounter list.
 */
export async function listEncountersUseCase(
  query?: TListEncountersQuery,
): Promise<TPaginatedEncounterResponse> {
  const service = getInjection("IEncounterService");
  return service.list(query);
}
