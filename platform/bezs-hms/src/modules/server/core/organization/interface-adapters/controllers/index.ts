/**
 * Barrel export for all Organization interface-adapter controllers and their output types.
 *
 * Import from this file rather than individual controller files so that the
 * server actions layer has a single, stable import path.
 */

export {
  registerOrganizationController,
  type TRegisterOrganizationControllerOutput,
} from "./registerOrganization.controller";

export {
  listOrganizationsController,
  type TListOrganizationsControllerOutput,
} from "./listOrganizations.controller";

export {
  getOrganizationByIdController,
  type TGetOrganizationByIdControllerOutput,
} from "./getOrganizationById.controller";

export {
  updateOrganizationController,
  type TUpdateOrganizationControllerOutput,
} from "./updateOrganization.controller";

export {
  deleteOrganizationController,
  type TDeleteOrganizationControllerOutput,
} from "./deleteOrganization.controller";
