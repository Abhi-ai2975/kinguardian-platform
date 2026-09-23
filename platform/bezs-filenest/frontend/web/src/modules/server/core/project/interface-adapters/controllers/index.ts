/**
 * Barrel export for all project interface-adapter controllers and output types.
 *
 * Import from this file rather than individual controller files so the
 * presentation layer has a single, stable import path.
 */
export {
  getProjectController,
  type TGetProjectControllerOutput,
} from "./getProject.controller";

export {
  listProjectsController,
  type TListProjectsControllerOutput,
} from "./listProjects.controller";

export {
  createProjectController,
  type TCreateProjectControllerOutput,
} from "./createProject.controller";

export {
  updateProjectController,
  type TUpdateProjectControllerOutput,
} from "./updateProject.controller";

export {
  deleteProjectController,
  type TDeleteProjectControllerOutput,
} from "./deleteProject.controller";
