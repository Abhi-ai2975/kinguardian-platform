/**
 * listSlotsUseCase — lists Slot resources.
 *
 * Layer: server / core / slot / application / usecases
 *
 * Delegates to ISlotService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TListSlotsQuery,
  type TPaginatedSlotResponse,
} from "@/modules/entities/schemas/slot";

/**
 * Lists Slots with optional filters and pagination.
 *
 * @param query - Optional filter/pagination params (status, schedule_id, practitioner_role_id, etc.).
 * @returns Paginated list of Slots.
 */
export async function listSlotsUseCase(
  query?: TListSlotsQuery,
): Promise<TPaginatedSlotResponse> {
  return getInjection("ISlotService").list(query);
}
