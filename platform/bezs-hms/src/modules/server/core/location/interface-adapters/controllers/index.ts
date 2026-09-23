/**
 * Barrel export for all Location interface-adapter controllers and their output types.
 *
 * Import from this file rather than individual controller files so that the
 * server actions layer has a single, stable import path.
 */

export {
  createLocationController,
  type TCreateLocationControllerOutput,
} from "./createLocation.controller";

export {
  listLocationsController,
  type TListLocationsControllerOutput,
} from "./listLocations.controller";

export {
  getLocationByIdController,
  type TGetLocationByIdControllerOutput,
} from "./getLocationById.controller";

export {
  updateLocationController,
  type TUpdateLocationControllerOutput,
} from "./updateLocation.controller";

export {
  deleteLocationController,
  type TDeleteLocationControllerOutput,
} from "./deleteLocation.controller";
