/**
 * Practitioner controllers barrel.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 *
 * Re-exports every controller function and its output type. All external
 * consumers import from this barrel — never from individual controller files.
 */

// ── Core CRUD ─────────────────────────────────────────────────────────────────
export {
  createPractitionerController,
  type TCreatePractitionerControllerOutput,
} from "./createPractitioner.controller";

export {
  createPractitionerFullController,
  type TCreatePractitionerFullControllerOutput,
} from "./createPractitionerFull.controller";

export {
  updatePractitionerFullController,
  type TUpdatePractitionerFullControllerOutput,
} from "./updatePractitionerFull.controller";

export {
  listPractitionersController,
  type TListPractitionersControllerOutput,
} from "./listPractitioners.controller";

export {
  getMyPractitionerController,
  type TGetMyPractitionerControllerOutput,
} from "./getMyPractitioner.controller";

export {
  getPractitionerByIdController,
  type TGetPractitionerByIdControllerOutput,
} from "./getPractitionerById.controller";

export {
  updatePractitionerController,
  type TUpdatePractitionerControllerOutput,
} from "./updatePractitioner.controller";

export { deletePractitionerController } from "./deletePractitioner.controller";

// ── Names ─────────────────────────────────────────────────────────────────────
export {
  addPractitionerNameController,
  type TAddPractitionerNameControllerOutput,
} from "./addPractitionerName.controller";

export {
  listPractitionerNamesController,
  type TListPractitionerNamesControllerOutput,
} from "./listPractitionerNames.controller";

export {
  patchPractitionerNameController,
  type TPatchPractitionerNameControllerOutput,
} from "./patchPractitionerName.controller";

export { deletePractitionerNameController } from "./deletePractitionerName.controller";

// ── Identifiers ────────────────────────────────────────────────────────────────
export {
  addPractitionerIdentifierController,
  type TAddPractitionerIdentifierControllerOutput,
} from "./addPractitionerIdentifier.controller";

export {
  listPractitionerIdentifiersController,
  type TListPractitionerIdentifiersControllerOutput,
} from "./listPractitionerIdentifiers.controller";

export {
  patchPractitionerIdentifierController,
  type TPatchPractitionerIdentifierControllerOutput,
} from "./patchPractitionerIdentifier.controller";

export { deletePractitionerIdentifierController } from "./deletePractitionerIdentifier.controller";

// ── Telecom ───────────────────────────────────────────────────────────────────
export {
  addPractitionerTelecomController,
  type TAddPractitionerTelecomControllerOutput,
} from "./addPractitionerTelecom.controller";

export {
  listPractitionerTelecomController,
  type TListPractitionerTelecomControllerOutput,
} from "./listPractitionerTelecom.controller";

export {
  patchPractitionerTelecomController,
  type TPatchPractitionerTelecomControllerOutput,
} from "./patchPractitionerTelecom.controller";

export { deletePractitionerTelecomController } from "./deletePractitionerTelecom.controller";

// ── Addresses ─────────────────────────────────────────────────────────────────
export {
  addPractitionerAddressController,
  type TAddPractitionerAddressControllerOutput,
} from "./addPractitionerAddress.controller";

export {
  listPractitionerAddressesController,
  type TListPractitionerAddressesControllerOutput,
} from "./listPractitionerAddresses.controller";

export {
  patchPractitionerAddressController,
  type TPatchPractitionerAddressControllerOutput,
} from "./patchPractitionerAddress.controller";

export { deletePractitionerAddressController } from "./deletePractitionerAddress.controller";

// ── Photos ────────────────────────────────────────────────────────────────────
export {
  addPractitionerPhotoController,
  type TAddPractitionerPhotoControllerOutput,
} from "./addPractitionerPhoto.controller";

export {
  listPractitionerPhotosController,
  type TListPractitionerPhotosControllerOutput,
} from "./listPractitionerPhotos.controller";

export {
  patchPractitionerPhotoController,
  type TPatchPractitionerPhotoControllerOutput,
} from "./patchPractitionerPhoto.controller";

export { deletePractitionerPhotoController } from "./deletePractitionerPhoto.controller";

// ── Qualifications ────────────────────────────────────────────────────────────
export {
  addPractitionerQualificationController,
  type TAddPractitionerQualificationControllerOutput,
} from "./addPractitionerQualification.controller";

export {
  listPractitionerQualificationsController,
  type TListPractitionerQualificationsControllerOutput,
} from "./listPractitionerQualifications.controller";

export {
  patchPractitionerQualificationController,
  type TPatchPractitionerQualificationControllerOutput,
} from "./patchPractitionerQualification.controller";

export { deletePractitionerQualificationController } from "./deletePractitionerQualification.controller";

// ── Communications ────────────────────────────────────────────────────────────
export {
  addPractitionerCommunicationController,
  type TAddPractitionerCommunicationControllerOutput,
} from "./addPractitionerCommunication.controller";

export {
  listPractitionerCommunicationsController,
  type TListPractitionerCommunicationsControllerOutput,
} from "./listPractitionerCommunications.controller";

export {
  patchPractitionerCommunicationController,
  type TPatchPractitionerCommunicationControllerOutput,
} from "./patchPractitionerCommunication.controller";

export { deletePractitionerCommunicationController } from "./deletePractitionerCommunication.controller";
