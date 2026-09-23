/**
 * Barrel export for all file domain controllers.
 *
 * @module
 */
export {
  listFilesController,
  type TListFilesControllerOutput,
} from "./listFiles.controller";

export {
  deleteFileController,
  type TDeleteFileControllerOutput,
} from "./deleteFile.controller";

export {
  getFileDownloadUrlController,
  type TGetFileDownloadUrlControllerOutput,
} from "./getFileDownloadUrl.controller";

export {
  setTagsController,
  type TSetTagsControllerOutput,
} from "./setTags.controller";

export {
  addTagsController,
  type TAddTagsControllerOutput,
} from "./addTags.controller";

export {
  updateMetadataController,
  type TUpdateMetadataControllerOutput,
} from "./updateMetadata.controller";

export {
  mergeMetadataController,
  type TMergeMetadataControllerOutput,
} from "./mergeMetadata.controller";

export {
  initiateUploadController,
  type TInitiateUploadControllerOutput,
} from "./initiateUpload.controller";

export {
  confirmUploadController,
  type TConfirmUploadControllerOutput,
} from "./confirmUpload.controller";

export {
  initiateMultipartController,
  type TInitiateMultipartControllerOutput,
} from "./initiateMultipart.controller";

export {
  getPartUrlController,
  type TGetPartUrlControllerOutput,
} from "./getPartUrl.controller";

export {
  completeMultipartController,
  type TCompleteMultipartControllerOutput,
} from "./completeMultipart.controller";

export {
  abortMultipartController,
  type TAbortMultipartControllerOutput,
} from "./abortMultipart.controller";

export {
  renameFileController,
  type TRenameFileControllerOutput,
} from "./renameFile.controller";

export {
  moveFileController,
  type TMoveFileControllerOutput,
} from "./moveFile.controller";
