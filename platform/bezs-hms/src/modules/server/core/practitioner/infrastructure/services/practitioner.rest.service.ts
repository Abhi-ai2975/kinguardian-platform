/**
 * PractitionerRestApiService — REST transport shell for the Practitioner resource.
 *
 * Layer: server / core / practitioner / infrastructure / services
 *
 * Implements IPractitionersService by creating a single AxiosInstance (base URL:
 * FHIR_GQL_URL/practitioners) and delegating every method to the appropriate
 * sub-service in the rest/ subfolder.
 *
 * Shell body contains zero business logic — only constructor wiring and one-liner
 * delegations. Bound by the DI module when FHIR_TRANSPORT != "graphql".
 */

import axios from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { IPractitionersService } from "../../domain/interfaces/practitioner.service.interface";
import { PractitionerCoreRestService } from "./rest/practitioner.core.rest.service";
import { PractitionerNamesRestService } from "./rest/practitioner.names.rest.service";
import { PractitionerIdentifiersRestService } from "./rest/practitioner.identifiers.rest.service";
import { PractitionerTelecomRestService } from "./rest/practitioner.telecom.rest.service";
import { PractitionerAddressesRestService } from "./rest/practitioner.addresses.rest.service";
import { PractitionerPhotosRestService } from "./rest/practitioner.photos.rest.service";
import { PractitionerQualificationsRestService } from "./rest/practitioner.qualifications.rest.service";
import { PractitionerCommunicationsRestService } from "./rest/practitioner.communications.rest.service";
import {
  type TPractitionerResponse,
  type TPaginatedPractitionerResponse,
  type TPractitionerNameResponse,
  type TPractitionerNameListResponse,
  type TPractitionerIdentifierResponse,
  type TPractitionerIdentifierListResponse,
  type TPractitionerTelecomResponse,
  type TPractitionerTelecomListResponse,
  type TPractitionerAddressResponse,
  type TPractitionerAddressListResponse,
  type TPractitionerPhotoResponse,
  type TPractitionerPhotoListResponse,
  type TPractitionerQualificationResponse,
  type TPractitionerQualificationListResponse,
  type TPractitionerCommunicationResponse,
  type TPractitionerCommunicationListResponse,
} from "@/modules/entities/schemas/practitioner";
import {
  type TCreatePractitioner,
  type TCreatePractitionerFull,
  type TPractitionerPatchDto,
  type TUpdatePractitionerFullDto,
  type TListPractitionersQuery,
  type TAddPractitionerName,
  type TPatchPractitionerNameDto,
  type TAddPractitionerIdentifier,
  type TPatchPractitionerIdentifierDto,
  type TAddPractitionerTelecom,
  type TPatchPractitionerTelecomDto,
  type TAddPractitionerAddress,
  type TPatchPractitionerAddressDto,
  type TAddPractitionerPhoto,
  type TPatchPractitionerPhotoDto,
  type TAddPractitionerQualification,
  type TPatchPractitionerQualificationDto,
  type TAddPractitionerCommunication,
  type TPatchPractitionerCommunicationDto,
} from "@/modules/entities/schemas/practitioner";

/**
 * Thin shell that wires a single AxiosInstance to all practitioner sub-services.
 * Every public method is a one-liner delegation — no direct HTTP calls here.
 */
export class PractitionerRestApiService implements IPractitionersService {
  private readonly core: PractitionerCoreRestService;
  private readonly names: PractitionerNamesRestService;
  private readonly identifiers: PractitionerIdentifiersRestService;
  private readonly telecom: PractitionerTelecomRestService;
  private readonly addresses: PractitionerAddressesRestService;
  private readonly photos: PractitionerPhotosRestService;
  private readonly qualifications: PractitionerQualificationsRestService;
  private readonly communications: PractitionerCommunicationsRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    // Single client shared across all sub-services.
    const client = axios.create({
      baseURL: `${url}/practitioners`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      maxRedirects: 5,
    });

    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new PractitionerCoreRestService(client);
    this.names = new PractitionerNamesRestService(client);
    this.identifiers = new PractitionerIdentifiersRestService(client);
    this.telecom = new PractitionerTelecomRestService(client);
    this.addresses = new PractitionerAddressesRestService(client);
    this.photos = new PractitionerPhotosRestService(client);
    this.qualifications = new PractitionerQualificationsRestService(client);
    this.communications = new PractitionerCommunicationsRestService(client);
  }

  // ── Core CRUD delegations ─────────────────────────────────────────────────

  /** @inheritdoc */
  create(dto: TCreatePractitioner): Promise<TPractitionerResponse> {
    return this.core.create(dto);
  }
  /** @inheritdoc */
  createFull(dto: TCreatePractitionerFull): Promise<TPractitionerResponse> {
    return this.core.createFull(dto);
  }
  /** @inheritdoc */
  updateFull(
    id: number,
    dto: TUpdatePractitionerFullDto,
  ): Promise<TPractitionerResponse> {
    return this.core.updateFull(id, dto);
  }
  /** @inheritdoc */
  list(
    query?: TListPractitionersQuery,
  ): Promise<TPaginatedPractitionerResponse> {
    return this.core.list(query);
  }
  /** @inheritdoc */
  getMe(): Promise<TPractitionerResponse> {
    return this.core.getMe();
  }
  /** @inheritdoc */
  getById(id: number): Promise<TPractitionerResponse> {
    return this.core.getById(id);
  }
  /** @inheritdoc */
  update(
    id: number,
    dto: TPractitionerPatchDto,
  ): Promise<TPractitionerResponse> {
    return this.core.update(id, dto);
  }
  /** @inheritdoc */
  delete(id: number): Promise<void> {
    return this.core.delete(id);
  }

  // ── Names delegations ──────────────────────────────────────────────────────

  addName(
    pid: number,
    dto: TAddPractitionerName,
  ): Promise<TPractitionerNameResponse> {
    return this.names.add(pid, dto);
  }
  listNames(pid: number): Promise<TPractitionerNameListResponse> {
    return this.names.list(pid);
  }
  patchName(
    pid: number,
    nameId: number,
    dto: TPatchPractitionerNameDto,
  ): Promise<TPractitionerNameResponse> {
    return this.names.patch(pid, nameId, dto);
  }
  deleteName(pid: number, nameId: number): Promise<void> {
    return this.names.delete(pid, nameId);
  }

  // ── Identifiers delegations ────────────────────────────────────────────────

  addIdentifier(
    pid: number,
    dto: TAddPractitionerIdentifier,
  ): Promise<TPractitionerIdentifierResponse> {
    return this.identifiers.add(pid, dto);
  }
  listIdentifiers(pid: number): Promise<TPractitionerIdentifierListResponse> {
    return this.identifiers.list(pid);
  }
  patchIdentifier(
    pid: number,
    identifierId: number,
    dto: TPatchPractitionerIdentifierDto,
  ): Promise<TPractitionerIdentifierResponse> {
    return this.identifiers.patch(pid, identifierId, dto);
  }
  deleteIdentifier(pid: number, identifierId: number): Promise<void> {
    return this.identifiers.delete(pid, identifierId);
  }

  // ── Telecom delegations ────────────────────────────────────────────────────

  addTelecom(
    pid: number,
    dto: TAddPractitionerTelecom,
  ): Promise<TPractitionerTelecomResponse> {
    return this.telecom.add(pid, dto);
  }
  listTelecom(pid: number): Promise<TPractitionerTelecomListResponse> {
    return this.telecom.list(pid);
  }
  patchTelecom(
    pid: number,
    telecomId: number,
    dto: TPatchPractitionerTelecomDto,
  ): Promise<TPractitionerTelecomResponse> {
    return this.telecom.patch(pid, telecomId, dto);
  }
  deleteTelecom(pid: number, telecomId: number): Promise<void> {
    return this.telecom.delete(pid, telecomId);
  }

  // ── Addresses delegations ──────────────────────────────────────────────────

  addAddress(
    pid: number,
    dto: TAddPractitionerAddress,
  ): Promise<TPractitionerAddressResponse> {
    return this.addresses.add(pid, dto);
  }
  listAddresses(pid: number): Promise<TPractitionerAddressListResponse> {
    return this.addresses.list(pid);
  }
  patchAddress(
    pid: number,
    addressId: number,
    dto: TPatchPractitionerAddressDto,
  ): Promise<TPractitionerAddressResponse> {
    return this.addresses.patch(pid, addressId, dto);
  }
  deleteAddress(pid: number, addressId: number): Promise<void> {
    return this.addresses.delete(pid, addressId);
  }

  // ── Photos delegations ─────────────────────────────────────────────────────

  addPhoto(
    pid: number,
    dto: TAddPractitionerPhoto,
  ): Promise<TPractitionerPhotoResponse> {
    return this.photos.add(pid, dto);
  }
  listPhotos(pid: number): Promise<TPractitionerPhotoListResponse> {
    return this.photos.list(pid);
  }
  patchPhoto(
    pid: number,
    photoId: number,
    dto: TPatchPractitionerPhotoDto,
  ): Promise<TPractitionerPhotoResponse> {
    return this.photos.patch(pid, photoId, dto);
  }
  deletePhoto(pid: number, photoId: number): Promise<void> {
    return this.photos.delete(pid, photoId);
  }

  // ── Qualifications delegations ─────────────────────────────────────────────

  addQualification(
    pid: number,
    dto: TAddPractitionerQualification,
  ): Promise<TPractitionerQualificationResponse> {
    return this.qualifications.add(pid, dto);
  }
  listQualifications(
    pid: number,
  ): Promise<TPractitionerQualificationListResponse> {
    return this.qualifications.list(pid);
  }
  patchQualification(
    pid: number,
    qualificationId: number,
    dto: TPatchPractitionerQualificationDto,
  ): Promise<TPractitionerQualificationResponse> {
    return this.qualifications.patch(pid, qualificationId, dto);
  }
  deleteQualification(pid: number, qualificationId: number): Promise<void> {
    return this.qualifications.delete(pid, qualificationId);
  }

  // ── Communications delegations ─────────────────────────────────────────────

  addCommunication(
    pid: number,
    dto: TAddPractitionerCommunication,
  ): Promise<TPractitionerCommunicationResponse> {
    return this.communications.add(pid, dto);
  }
  listCommunications(
    pid: number,
  ): Promise<TPractitionerCommunicationListResponse> {
    return this.communications.list(pid);
  }
  patchCommunication(
    pid: number,
    communicationId: number,
    dto: TPatchPractitionerCommunicationDto,
  ): Promise<TPractitionerCommunicationResponse> {
    return this.communications.patch(pid, communicationId, dto);
  }
  deleteCommunication(pid: number, communicationId: number): Promise<void> {
    return this.communications.delete(pid, communicationId);
  }
}
