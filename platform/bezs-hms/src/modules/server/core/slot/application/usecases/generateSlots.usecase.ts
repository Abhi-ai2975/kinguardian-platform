/**
 * generateSlotsUseCase — bulk-generates Slots for a Schedule within a window.
 *
 * Layer: server / core / slot / application / usecases
 *
 * Delegates to ISlotService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TGenerateSlots,
  type TSlotGenerateResponse,
} from "@/modules/entities/schemas/slot";

/**
 * Generates one free Slot per slot_duration_minutes interval within the
 * requested window for the given Schedule.
 *
 * @param dto - Payload validated by GenerateSlotsValidationSchema.
 * @returns Summary with generated_count, slot_ids, and the generation window used.
 */
export async function generateSlotsUseCase(
  dto: TGenerateSlots,
): Promise<TSlotGenerateResponse> {
  return getInjection("ISlotService").generate(dto);
}
