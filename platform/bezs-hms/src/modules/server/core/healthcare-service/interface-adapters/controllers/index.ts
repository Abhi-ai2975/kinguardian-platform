/**
 * Barrel export for all HealthcareService interface-adapter controllers and their output types.
 *
 * Import from this file rather than individual controller files so that the
 * server actions layer has a single, stable import path.
 */

export {
  createHealthcareServiceController,
  type TCreateHealthcareServiceControllerOutput,
} from "./createHealthcareService.controller";

export {
  listHealthcareServicesController,
  type TListHealthcareServicesControllerOutput,
} from "./listHealthcareServices.controller";

export {
  getHealthcareServiceByIdController,
  type TGetHealthcareServiceByIdControllerOutput,
} from "./getHealthcareServiceById.controller";

export {
  updateHealthcareServiceController,
  type TUpdateHealthcareServiceControllerOutput,
} from "./updateHealthcareService.controller";

export {
  deleteHealthcareServiceController,
  type TDeleteHealthcareServiceControllerOutput,
} from "./deleteHealthcareService.controller";
