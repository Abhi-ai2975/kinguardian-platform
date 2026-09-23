/**
 * Barrel export for all Patient interface-adapter controllers and their output types.
 *
 * Layer: interface-adapters / controllers
 *
 * Import from this file — never from individual controller files — so the
 * server actions layer has a single, stable import path.
 */

// ── Core ──────────────────────────────────────────────────────────────────────

export { createPatientController, type TCreatePatientControllerOutput } from "./createPatient.controller";
export { createPatientFullController, type TCreatePatientFullControllerOutput } from "./createPatientFull.controller";
export { updatePatientFullController, type TUpdatePatientFullControllerOutput } from "./updatePatientFull.controller";
export { listPatientsController, type TListPatientsControllerOutput } from "./listPatients.controller";
export { getPatientMeController, type TGetPatientMeControllerOutput } from "./getPatientMe.controller";
export { getPatientByIdController, type TGetPatientByIdControllerOutput } from "./getPatientById.controller";
export { updatePatientController, type TUpdatePatientControllerOutput } from "./updatePatient.controller";
export { deletePatientController, type TDeletePatientControllerOutput } from "./deletePatient.controller";

// ── Names ─────────────────────────────────────────────────────────────────────

export { addPatientNameController, type TAddPatientNameControllerOutput } from "./addPatientName.controller";
export { listPatientNamesController, type TListPatientNamesControllerOutput } from "./listPatientNames.controller";
export { patchPatientNameController, type TPatchPatientNameControllerOutput } from "./patchPatientName.controller";
export { deletePatientNameController, type TDeletePatientNameControllerOutput } from "./deletePatientName.controller";

// ── Identifiers ───────────────────────────────────────────────────────────────

export { addPatientIdentifierController, type TAddPatientIdentifierControllerOutput } from "./addPatientIdentifier.controller";
export { listPatientIdentifiersController, type TListPatientIdentifiersControllerOutput } from "./listPatientIdentifiers.controller";
export { patchPatientIdentifierController, type TPatchPatientIdentifierControllerOutput } from "./patchPatientIdentifier.controller";
export { deletePatientIdentifierController, type TDeletePatientIdentifierControllerOutput } from "./deletePatientIdentifier.controller";

// ── Telecom ───────────────────────────────────────────────────────────────────

export { addPatientTelecomController, type TAddPatientTelecomControllerOutput } from "./addPatientTelecom.controller";
export { listPatientTelecomsController, type TListPatientTelecomsControllerOutput } from "./listPatientTelecoms.controller";
export { patchPatientTelecomController, type TPatchPatientTelecomControllerOutput } from "./patchPatientTelecom.controller";
export { deletePatientTelecomController, type TDeletePatientTelecomControllerOutput } from "./deletePatientTelecom.controller";

// ── Addresses ─────────────────────────────────────────────────────────────────

export { addPatientAddressController, type TAddPatientAddressControllerOutput } from "./addPatientAddress.controller";
export { listPatientAddressesController, type TListPatientAddressesControllerOutput } from "./listPatientAddresses.controller";
export { patchPatientAddressController, type TPatchPatientAddressControllerOutput } from "./patchPatientAddress.controller";
export { deletePatientAddressController, type TDeletePatientAddressControllerOutput } from "./deletePatientAddress.controller";

// ── Photos ────────────────────────────────────────────────────────────────────

export { addPatientPhotoController, type TAddPatientPhotoControllerOutput } from "./addPatientPhoto.controller";
export { listPatientPhotosController, type TListPatientPhotosControllerOutput } from "./listPatientPhotos.controller";
export { patchPatientPhotoController, type TPatchPatientPhotoControllerOutput } from "./patchPatientPhoto.controller";
export { deletePatientPhotoController, type TDeletePatientPhotoControllerOutput } from "./deletePatientPhoto.controller";

// ── Contacts ──────────────────────────────────────────────────────────────────

export { addPatientContactController, type TAddPatientContactControllerOutput } from "./addPatientContact.controller";
export { listPatientContactsController, type TListPatientContactsControllerOutput } from "./listPatientContacts.controller";
export { patchPatientContactController, type TPatchPatientContactControllerOutput } from "./patchPatientContact.controller";
export { deletePatientContactController, type TDeletePatientContactControllerOutput } from "./deletePatientContact.controller";

// ── Communications ────────────────────────────────────────────────────────────

export { addPatientCommunicationController, type TAddPatientCommunicationControllerOutput } from "./addPatientCommunication.controller";
export { listPatientCommunicationsController, type TListPatientCommunicationsControllerOutput } from "./listPatientCommunications.controller";
export { patchPatientCommunicationController, type TPatchPatientCommunicationControllerOutput } from "./patchPatientCommunication.controller";
export { deletePatientCommunicationController, type TDeletePatientCommunicationControllerOutput } from "./deletePatientCommunication.controller";

// ── General Practitioners ─────────────────────────────────────────────────────

export { addPatientGeneralPractitionerController, type TAddPatientGeneralPractitionerControllerOutput } from "./addPatientGeneralPractitioner.controller";
export { listPatientGeneralPractitionersController, type TListPatientGeneralPractitionersControllerOutput } from "./listPatientGeneralPractitioners.controller";
export { patchPatientGeneralPractitionerController, type TPatchPatientGeneralPractitionerControllerOutput } from "./patchPatientGeneralPractitioner.controller";
export { deletePatientGeneralPractitionerController, type TDeletePatientGeneralPractitionerControllerOutput } from "./deletePatientGeneralPractitioner.controller";

// ── Links ─────────────────────────────────────────────────────────────────────

export { addPatientLinkController, type TAddPatientLinkControllerOutput } from "./addPatientLink.controller";
export { listPatientLinksController, type TListPatientLinksControllerOutput } from "./listPatientLinks.controller";
export { patchPatientLinkController, type TPatchPatientLinkControllerOutput } from "./patchPatientLink.controller";
export { deletePatientLinkController, type TDeletePatientLinkControllerOutput } from "./deletePatientLink.controller";
