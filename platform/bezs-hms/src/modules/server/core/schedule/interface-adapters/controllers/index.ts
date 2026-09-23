/**
 * Barrel export for all Schedule interface-adapter controllers and their output types.
 *
 * Import from this file rather than individual controller files so that the
 * server actions layer has a single, stable import path.
 */

export {
  createScheduleController,
  type TCreateScheduleControllerOutput,
} from "./createSchedule.controller";

export {
  listSchedulesController,
  type TListSchedulesControllerOutput,
} from "./listSchedules.controller";

export {
  getScheduleByIdController,
  type TGetScheduleByIdControllerOutput,
} from "./getScheduleById.controller";

export {
  updateScheduleController,
  type TUpdateScheduleControllerOutput,
} from "./updateSchedule.controller";

export {
  deleteScheduleController,
  type TDeleteScheduleControllerOutput,
} from "./deleteSchedule.controller";
