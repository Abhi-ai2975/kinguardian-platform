/**
 * updateSlotUseCase — patches scalar fields on a Slot.
 *
 * Layer: server / core / slot / application / usecases
 *
 * Delegates to ISlotService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TSlotPatchDto,
  type TSlotResponse,
} from "@/modules/entities/schemas/slot";

/**
 * Patches scalar fields on an existing Slot.
 *
 * @param id  - Slot DB id.
 * @param dto - Partial scalar fields validated by SlotPatchDtoSchema.
 * @returns The updated Slot resource.
 */
export async function updateSlotUseCase(
  id: number,
  dto: TSlotPatchDto,
): Promise<TSlotResponse> {
  return getInjection("ISlotService").update(id, dto);
}
