/**
 * Barrel export for all folder domain controllers.
 *
 * @module
 */
export {
  listFoldersController,
  type TListFoldersControllerOutput,
} from "./listFolders.controller";

export {
  createFolderController,
  type TCreateFolderControllerOutput,
} from "./createFolder.controller";

export {
  deleteFolderController,
  type TDeleteFolderControllerOutput,
} from "./deleteFolder.controller";
