/**
 * Patient server actions barrel.
 *
 * Layer: presentation / actions / patient
 *
 * Single import point for all 42 Patient server actions split by sub-resource.
 * Import from this barrel — never from individual action files.
 *
 *  core.actions.ts                  — create, list, getMe, getById, update, delete
 *  names.actions.ts                 — addName, listNames, patchName, deleteName
 *  identifiers.actions.ts           — addIdentifier, listIdentifiers, patchIdentifier, deleteIdentifier
 *  telecom.actions.ts               — addTelecom, listTelecom, patchTelecom, deleteTelecom
 *  addresses.actions.ts             — addAddress, listAddresses, patchAddress, deleteAddress
 *  photos.actions.ts                — addPhoto, listPhotos, patchPhoto, deletePhoto
 *  contacts.actions.ts              — addContact, listContacts, patchContact, deleteContact
 *  communications.actions.ts        — addCommunication, listCommunications, patchCommunication, deleteCommunication
 *  general-practitioners.actions.ts — addGeneralPractitioner, listGeneralPractitioners, patchGeneralPractitioner, deleteGeneralPractitioner
 *  links.actions.ts                 — addLink, listLinks, patchLink, deleteLink
 */

export * from "./core.actions";
export * from "./names.actions";
export * from "./identifiers.actions";
export * from "./telecom.actions";
export * from "./addresses.actions";
export * from "./photos.actions";
export * from "./contacts.actions";
export * from "./communications.actions";
export * from "./general-practitioners.actions";
export * from "./links.actions";
