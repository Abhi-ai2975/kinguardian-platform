/**
 * PractitionerRole controllers barrel.
 *
 * Layer: server / core / practitioner-role / interface-adapters / controllers
 *
 * Re-exports every controller function and its output type. All external
 * consumers import from this barrel — never from individual controller files.
 */

export {
  createPractitionerRoleController,
  type TCreatePractitionerRoleControllerOutput,
} from "./createPractitionerRole.controller";

export {
  listPractitionerRolesController,
  type TListPractitionerRolesControllerOutput,
} from "./listPractitionerRoles.controller";

export {
  listPractitionerRolesForBookingController,
  type TListPractitionerRolesForBookingControllerOutput,
} from "./listPractitionerRolesForBooking.controller";

export {
  getPractitionerRoleByIdController,
  type TGetPractitionerRoleByIdControllerOutput,
} from "./getPractitionerRoleById.controller";

export {
  updatePractitionerRoleController,
  type TUpdatePractitionerRoleControllerOutput,
} from "./updatePractitionerRole.controller";

export { deletePractitionerRoleController } from "./deletePractitionerRole.controller";
