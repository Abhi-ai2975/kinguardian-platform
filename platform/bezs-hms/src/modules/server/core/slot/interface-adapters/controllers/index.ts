/**
 * Slot controllers barrel.
 *
 * Layer: server / core / slot / interface-adapters / controllers
 *
 * Re-exports every controller function and its output type. All external
 * consumers import from this barrel — never from individual controller files.
 */

export {
  createSlotController,
  type TCreateSlotControllerOutput,
} from "./createSlot.controller";

export {
  listSlotsController,
  type TListSlotsControllerOutput,
} from "./listSlots.controller";

export {
  getSlotByIdController,
  type TGetSlotByIdControllerOutput,
} from "./getSlotById.controller";

export {
  updateSlotController,
  type TUpdateSlotControllerOutput,
} from "./updateSlot.controller";

export { deleteSlotController } from "./deleteSlot.controller";

export {
  generateSlotsController,
  type TGenerateSlotsControllerOutput,
} from "./generateSlots.controller";
