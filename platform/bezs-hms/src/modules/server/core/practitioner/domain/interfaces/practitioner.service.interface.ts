/**
 * IPractitionersService — domain interface for the Practitioner resource.
 *
 * Layer: server / core / practitioner / domain
 *
 * Defines the contract that all transport implementations (REST, GraphQL) must
 * satisfy. Use cases depend only on this interface; the concrete implementation
 * is resolved by the DI container at runtime.
 *
 * Naming: plural (IPractitionersService) per project convention.
 */

import {
  TPractitionerResponse,
  TPaginatedPractitionerResponse,
  TPractitionerNameResponse,
  TPractitionerNameListResponse,
  TPractitionerIdentifierResponse,
  TPractitionerIdentifierListResponse,
  TPractitionerTelecomResponse,
  TPractitionerTelecomListResponse,
  TPractitionerAddressResponse,
  TPractitionerAddressListResponse,
  TPractitionerPhotoResponse,
  TPractitionerPhotoListResponse,
  TPractitionerQualificationResponse,
  TPractitionerQualificationListResponse,
  TPractitionerCommunicationResponse,
  TPractitionerCommunicationListResponse,
} from "@/modules/entities/schemas/practitioner";
import {
  TCreatePractitioner,
  TCreatePractitionerFull,
  TPractitionerPatchDto,
  TUpdatePractitionerFullDto,
  TListPractitionersQuery,
  // names
  TAddPractitionerName,
  TPatchPractitionerNameDto,
  // identifiers
  TAddPractitionerIdentifier,
  TPatchPractitionerIdentifierDto,
  // telecom
  TAddPractitionerTelecom,
  TPatchPractitionerTelecomDto,
  // addresses
  TAddPractitionerAddress,
  TPatchPractitionerAddressDto,
  // photos
  TAddPractitionerPhoto,
  TPatchPractitionerPhotoDto,
  // qualifications
  TAddPractitionerQualification,
  TPatchPractitionerQualificationDto,
  // communications
  TAddPractitionerCommunication,
  TPatchPractitionerCommunicationDto,
} from "@/modules/entities/schemas/practitioner";

/**
 * Contract for all Practitioner operations (CRUD + 7 sub-resource groups).
 * Implemented by PractitionerRestApiService and PractitionerGraphQLService.
 */
export interface IPractitionersService {
  // ── Core CRUD ──────────────────────────────────────────────────────────────

  /**
   * Creates a new Practitioner record.
   * @param dto - Practitioner creation payload.
   * @returns The created Practitioner resource.
   */
  create(dto: TCreatePractitioner): Promise<TPractitionerResponse>;

  /**
   * Atomically creates a Practitioner with sub-resources in one transaction.
   * @param dto - Full create payload including optional sub-resource arrays.
   * @returns The created Practitioner resource with all nested sub-resources.
   */
  createFull(dto: TCreatePractitionerFull): Promise<TPractitionerResponse>;

  /**
   * Atomically updates a Practitioner's scalar fields and sub-resource arrays.
   * @param id - Practitioner DB id.
   * @param dto - Full update payload with optional scalar fields and sub-resource arrays.
   * @returns The updated Practitioner resource.
   */
  updateFull(id: number, dto: TUpdatePractitionerFullDto): Promise<TPractitionerResponse>;

  /**
   * Lists Practitioners with optional filters and pagination.
   * @param query - Optional filter/pagination params.
   * @returns Paginated list of Practitioners.
   */
  list(query?: TListPractitionersQuery): Promise<TPaginatedPractitionerResponse>;

  /**
   * Fetches the Practitioner record for the authenticated caller via GET /practitioners/me.
   * The JWT sub is used server-side — no userId is needed from the client.
   * @returns The caller's Practitioner resource.
   * @throws NotFoundError when no Practitioner is linked to the caller's JWT.
   */
  getMe(): Promise<TPractitionerResponse>;

  /**
   * Fetches a single Practitioner by numeric ID.
   * @param id - Practitioner DB id.
   * @returns The Practitioner resource.
   * @throws NotFoundError when the id does not exist.
   */
  getById(id: number): Promise<TPractitionerResponse>;

  /**
   * Patches scalar fields on an existing Practitioner.
   * @param id - Practitioner DB id.
   * @param dto - Partial practitioner fields to update.
   * @returns The updated Practitioner resource.
   */
  update(id: number, dto: TPractitionerPatchDto): Promise<TPractitionerResponse>;

  /**
   * Deletes a Practitioner record and all related sub-resources.
   * @param id - Practitioner DB id.
   */
  delete(id: number): Promise<void>;

  // ── Names ──────────────────────────────────────────────────────────────────

  /** @returns Updated full Practitioner resource after adding a name. */
  addName(practitionerId: number, dto: TAddPractitionerName): Promise<TPractitionerNameResponse>;
  listNames(practitionerId: number): Promise<TPractitionerNameListResponse>;
  patchName(practitionerId: number, nameId: number, dto: TPatchPractitionerNameDto): Promise<TPractitionerNameResponse>;
  deleteName(practitionerId: number, nameId: number): Promise<void>;

  // ── Identifiers ────────────────────────────────────────────────────────────

  addIdentifier(practitionerId: number, dto: TAddPractitionerIdentifier): Promise<TPractitionerIdentifierResponse>;
  listIdentifiers(practitionerId: number): Promise<TPractitionerIdentifierListResponse>;
  patchIdentifier(practitionerId: number, identifierId: number, dto: TPatchPractitionerIdentifierDto): Promise<TPractitionerIdentifierResponse>;
  deleteIdentifier(practitionerId: number, identifierId: number): Promise<void>;

  // ── Telecom ────────────────────────────────────────────────────────────────

  addTelecom(practitionerId: number, dto: TAddPractitionerTelecom): Promise<TPractitionerTelecomResponse>;
  listTelecom(practitionerId: number): Promise<TPractitionerTelecomListResponse>;
  patchTelecom(practitionerId: number, telecomId: number, dto: TPatchPractitionerTelecomDto): Promise<TPractitionerTelecomResponse>;
  deleteTelecom(practitionerId: number, telecomId: number): Promise<void>;

  // ── Addresses ──────────────────────────────────────────────────────────────

  addAddress(practitionerId: number, dto: TAddPractitionerAddress): Promise<TPractitionerAddressResponse>;
  listAddresses(practitionerId: number): Promise<TPractitionerAddressListResponse>;
  patchAddress(practitionerId: number, addressId: number, dto: TPatchPractitionerAddressDto): Promise<TPractitionerAddressResponse>;
  deleteAddress(practitionerId: number, addressId: number): Promise<void>;

  // ── Photos ─────────────────────────────────────────────────────────────────

  addPhoto(practitionerId: number, dto: TAddPractitionerPhoto): Promise<TPractitionerPhotoResponse>;
  listPhotos(practitionerId: number): Promise<TPractitionerPhotoListResponse>;
  patchPhoto(practitionerId: number, photoId: number, dto: TPatchPractitionerPhotoDto): Promise<TPractitionerPhotoResponse>;
  deletePhoto(practitionerId: number, photoId: number): Promise<void>;

  // ── Qualifications ─────────────────────────────────────────────────────────

  addQualification(practitionerId: number, dto: TAddPractitionerQualification): Promise<TPractitionerQualificationResponse>;
  listQualifications(practitionerId: number): Promise<TPractitionerQualificationListResponse>;
  patchQualification(practitionerId: number, qualificationId: number, dto: TPatchPractitionerQualificationDto): Promise<TPractitionerQualificationResponse>;
  deleteQualification(practitionerId: number, qualificationId: number): Promise<void>;

  // ── Communications ─────────────────────────────────────────────────────────

  addCommunication(practitionerId: number, dto: TAddPractitionerCommunication): Promise<TPractitionerCommunicationResponse>;
  listCommunications(practitionerId: number): Promise<TPractitionerCommunicationListResponse>;
  patchCommunication(practitionerId: number, communicationId: number, dto: TPatchPractitionerCommunicationDto): Promise<TPractitionerCommunicationResponse>;
  deleteCommunication(practitionerId: number, communicationId: number): Promise<void>;
}
