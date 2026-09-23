/**
 * deleteSlotUseCase — deletes a Slot and all child records.
 *
 * Layer: server / core / slot / application / usecases
 *
 * Delegates to ISlotService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently removes a Slot and all related child records (cascade).
 *
 * @param id - Slot DB id.
 */
export async function deleteSlotUseCase(id: number): Promise<void> {
  return getInjection("ISlotService").delete(id);
}
