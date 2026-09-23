/**
 * createSlotUseCase — creates a new Slot resource.
 *
 * Layer: server / core / slot / application / usecases
 *
 * Delegates to ISlotService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TCreateSlot,
  type TSlotResponse,
} from "@/modules/entities/schemas/slot";

/**
 * Creates a new Slot with all inline child arrays.
 *
 * @param dto - Creation payload validated by CreateSlotValidationSchema.
 * @returns The created Slot resource.
 */
export async function createSlotUseCase(dto: TCreateSlot): Promise<TSlotResponse> {
  return getInjection("ISlotService").create(dto);
}
