/**
 * getSlotByIdUseCase — fetches a single Slot by numeric ID.
 *
 * Layer: server / core / slot / application / usecases
 *
 * Delegates to ISlotService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TSlotResponse } from "@/modules/entities/schemas/slot";

/**
 * Fetches a single Slot by numeric ID.
 *
 * @param id - Slot DB id.
 * @returns The Slot resource with all embedded child arrays.
 * @throws NotFoundError when the id does not exist.
 */
export async function getSlotByIdUseCase(id: number): Promise<TSlotResponse> {
  return getInjection("ISlotService").getById(id);
}
