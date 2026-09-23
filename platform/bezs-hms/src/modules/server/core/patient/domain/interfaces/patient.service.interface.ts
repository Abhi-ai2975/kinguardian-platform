/**
 * IPatientsService — domain interface for the Patient resource.
 *
 * Layer: domain / interfaces
 * Resource: Patient (FHIR R4)
 *
 * Defines the contract that every transport implementation (REST, GraphQL)
 * must satisfy. The DI container binds a concrete class to this symbol so
 * use cases stay decoupled from the HTTP layer.
 *
 * Covers all 43 operations exposed by the fhir-gql Patient API:
 *  - 6 core operations (create, list, getMe, getById, update, delete)
 *  - 9 sub-resources × 4 operations each = 36 sub-resource operations
 *    (names, identifiers, telecom, addresses, photos, contacts,
 *     communications, generalPractitioners, links)
 */

import type {
  TCreatePatient,
  TCreatePatientFull,
  TListPatientsQuery,
  TUpdatePatientDto,
  TUpdatePatientFullDto,
  TAddPatientName,
  TPatchPatientName,
  TAddPatientIdentifier,
  TPatchPatientIdentifier,
  TAddPatientTelecom,
  TPatchPatientTelecom,
  TAddPatientAddress,
  TPatchPatientAddress,
  TAddPatientPhoto,
  TPatchPatientPhoto,
  TAddPatientContact,
  TPatchPatientContact,
  TAddPatientCommunication,
  TPatchPatientCommunication,
  TAddPatientGP,
  TPatchPatientGP,
  TAddPatientLink,
  TPatchPatientLink,
} from "@/modules/entities/schemas/patient";
import type {
  TPatientResponse,
  TPaginatedPatientResponse,
  TPatientNamesList,
  TPatientIdentifiersList,
  TPatientTelecomList,
  TPatientAddressesList,
  TPatientPhotosList,
  TPatientContactsList,
  TPatientCommunicationsList,
  TPatientGeneralPractitionersList,
  TPatientLinksList,
} from "@/modules/entities/schemas/patient";

export interface IPatientsService {
  // ── Core ──────────────────────────────────────────────────────────────────

  /** POST /patients — create a new Patient. */
  create(dto: TCreatePatient): Promise<TPatientResponse>;

  /** POST /patients/full — atomically create a Patient with sub-resources. */
  createFull(dto: TCreatePatientFull): Promise<TPatientResponse>;

  /** PATCH /patients/{id}/full — atomically update scalar fields and sub-resource arrays. */
  updateFull(id: number, dto: TUpdatePatientFullDto): Promise<TPatientResponse>;

  /** GET /patients — paginated list with optional filters. */
  list(query?: TListPatientsQuery): Promise<TPaginatedPatientResponse>;

  /** GET /patients/me — fetch the caller's own Patient record. */
  getMe(): Promise<TPatientResponse>;

  /** GET /patients/{id} — fetch a single Patient by integer ID. */
  getById(id: number): Promise<TPatientResponse>;

  /** PATCH /patients/{id} — partial update of scalar fields. */
  update(id: number, dto: TUpdatePatientDto): Promise<TPatientResponse>;

  /** DELETE /patients/{id} — permanently remove a Patient and all child records. */
  delete(id: number): Promise<void>;

  // ── Names ─────────────────────────────────────────────────────────────────

  /** POST /patients/{patientId}/names — add a HumanName. */
  addName(patientId: number, dto: TAddPatientName): Promise<TPatientResponse>;

  /** GET /patients/{patientId}/names — list all names for the Patient. */
  listNames(patientId: number): Promise<TPatientNamesList>;

  /** PATCH /patients/{patientId}/names/{itemId} — update a specific name. */
  patchName(patientId: number, itemId: number, dto: TPatchPatientName): Promise<TPatientResponse>;

  /** DELETE /patients/{patientId}/names/{itemId} — remove a specific name. */
  deleteName(patientId: number, itemId: number): Promise<void>;

  // ── Identifiers ───────────────────────────────────────────────────────────

  /** POST /patients/{patientId}/identifiers — add an Identifier. */
  addIdentifier(patientId: number, dto: TAddPatientIdentifier): Promise<TPatientResponse>;

  /** GET /patients/{patientId}/identifiers — list all identifiers for the Patient. */
  listIdentifiers(patientId: number): Promise<TPatientIdentifiersList>;

  /** PATCH /patients/{patientId}/identifiers/{itemId} — update a specific identifier. */
  patchIdentifier(patientId: number, itemId: number, dto: TPatchPatientIdentifier): Promise<TPatientResponse>;

  /** DELETE /patients/{patientId}/identifiers/{itemId} — remove a specific identifier. */
  deleteIdentifier(patientId: number, itemId: number): Promise<void>;

  // ── Telecom ───────────────────────────────────────────────────────────────

  /** POST /patients/{patientId}/telecom — add a ContactPoint. */
  addTelecom(patientId: number, dto: TAddPatientTelecom): Promise<TPatientResponse>;

  /** GET /patients/{patientId}/telecom — list all telecom entries for the Patient. */
  listTelecom(patientId: number): Promise<TPatientTelecomList>;

  /** PATCH /patients/{patientId}/telecom/{itemId} — update a specific telecom entry. */
  patchTelecom(patientId: number, itemId: number, dto: TPatchPatientTelecom): Promise<TPatientResponse>;

  /** DELETE /patients/{patientId}/telecom/{itemId} — remove a specific telecom entry. */
  deleteTelecom(patientId: number, itemId: number): Promise<void>;

  // ── Addresses ─────────────────────────────────────────────────────────────

  /** POST /patients/{patientId}/addresses — add an Address. */
  addAddress(patientId: number, dto: TAddPatientAddress): Promise<TPatientResponse>;

  /** GET /patients/{patientId}/addresses — list all addresses for the Patient. */
  listAddresses(patientId: number): Promise<TPatientAddressesList>;

  /** PATCH /patients/{patientId}/addresses/{itemId} — update a specific address. */
  patchAddress(patientId: number, itemId: number, dto: TPatchPatientAddress): Promise<TPatientResponse>;

  /** DELETE /patients/{patientId}/addresses/{itemId} — remove a specific address. */
  deleteAddress(patientId: number, itemId: number): Promise<void>;

  // ── Photos ────────────────────────────────────────────────────────────────

  /** POST /patients/{patientId}/photos — add a photo Attachment. */
  addPhoto(patientId: number, dto: TAddPatientPhoto): Promise<TPatientResponse>;

  /** GET /patients/{patientId}/photos — list all photos for the Patient. */
  listPhotos(patientId: number): Promise<TPatientPhotosList>;

  /** PATCH /patients/{patientId}/photos/{itemId} — update a specific photo. */
  patchPhoto(patientId: number, itemId: number, dto: TPatchPatientPhoto): Promise<TPatientResponse>;

  /** DELETE /patients/{patientId}/photos/{itemId} — remove a specific photo. */
  deletePhoto(patientId: number, itemId: number): Promise<void>;

  // ── Contacts ──────────────────────────────────────────────────────────────

  /** POST /patients/{patientId}/contacts — add a contact person. */
  addContact(patientId: number, dto: TAddPatientContact): Promise<TPatientResponse>;

  /** GET /patients/{patientId}/contacts — list all contacts for the Patient. */
  listContacts(patientId: number): Promise<TPatientContactsList>;

  /** PATCH /patients/{patientId}/contacts/{itemId} — update a specific contact. */
  patchContact(patientId: number, itemId: number, dto: TPatchPatientContact): Promise<TPatientResponse>;

  /** DELETE /patients/{patientId}/contacts/{itemId} — remove a specific contact. */
  deleteContact(patientId: number, itemId: number): Promise<void>;

  // ── Communications ────────────────────────────────────────────────────────

  /** POST /patients/{patientId}/communications — add a language preference. */
  addCommunication(patientId: number, dto: TAddPatientCommunication): Promise<TPatientResponse>;

  /** GET /patients/{patientId}/communications — list all language preferences. */
  listCommunications(patientId: number): Promise<TPatientCommunicationsList>;

  /** PATCH /patients/{patientId}/communications/{itemId} — update a language preference. */
  patchCommunication(patientId: number, itemId: number, dto: TPatchPatientCommunication): Promise<TPatientResponse>;

  /** DELETE /patients/{patientId}/communications/{itemId} — remove a language preference. */
  deleteCommunication(patientId: number, itemId: number): Promise<void>;

  // ── General Practitioners ─────────────────────────────────────────────────

  /** POST /patients/{patientId}/general-practitioners — add a GP reference. */
  addGeneralPractitioner(patientId: number, dto: TAddPatientGP): Promise<TPatientResponse>;

  /** GET /patients/{patientId}/general-practitioners — list all GP references. */
  listGeneralPractitioners(patientId: number): Promise<TPatientGeneralPractitionersList>;

  /** PATCH /patients/{patientId}/general-practitioners/{itemId} — update a GP reference. */
  patchGeneralPractitioner(patientId: number, itemId: number, dto: TPatchPatientGP): Promise<TPatientResponse>;

  /** DELETE /patients/{patientId}/general-practitioners/{itemId} — remove a GP reference. */
  deleteGeneralPractitioner(patientId: number, itemId: number): Promise<void>;

  // ── Links ─────────────────────────────────────────────────────────────────

  /** POST /patients/{patientId}/links — add a link to another Patient or RelatedPerson. */
  addLink(patientId: number, dto: TAddPatientLink): Promise<TPatientResponse>;

  /** GET /patients/{patientId}/links — list all links for the Patient. */
  listLinks(patientId: number): Promise<TPatientLinksList>;

  /** PATCH /patients/{patientId}/links/{itemId} — update a specific link. */
  patchLink(patientId: number, itemId: number, dto: TPatchPatientLink): Promise<TPatientResponse>;

  /** DELETE /patients/{patientId}/links/{itemId} — remove a specific link. */
  deleteLink(patientId: number, itemId: number): Promise<void>;
}
