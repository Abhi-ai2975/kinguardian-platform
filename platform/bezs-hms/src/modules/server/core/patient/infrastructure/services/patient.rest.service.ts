/**
 * PatientRestApiService — REST transport implementation of IPatientsService.
 *
 * Layer: infrastructure / services
 * Resource: Patient (FHIR R4)
 * Transport: REST (fhir-gql REST API)
 *
 * This class is the DI-facing shell. It:
 *  1. Creates a single shared AxiosInstance (FHIR_GQL_URL as baseURL, JWT interceptor).
 *  2. Instantiates one focused sub-service per sub-resource group, passing the client.
 *  3. Delegates every IPatientsService method to the appropriate sub-service.
 *
 * No business logic lives here — all HTTP calls and logging are in rest/.
 *
 * Sub-service files:
 *  rest/patient.core.rest.service.ts                  — create, list, getMe, getById, update, delete
 *  rest/patient.names.rest.service.ts                 — names sub-resource (4 ops)
 *  rest/patient.identifiers.rest.service.ts           — identifiers sub-resource (4 ops)
 *  rest/patient.telecom.rest.service.ts               — telecom sub-resource (4 ops)
 *  rest/patient.addresses.rest.service.ts             — addresses sub-resource (4 ops)
 *  rest/patient.photos.rest.service.ts                — photos sub-resource (4 ops)
 *  rest/patient.contacts.rest.service.ts              — contacts sub-resource (4 ops)
 *  rest/patient.communications.rest.service.ts        — communications sub-resource (4 ops)
 *  rest/patient.general-practitioners.rest.service.ts — general-practitioners sub-resource (4 ops)
 *  rest/patient.links.rest.service.ts                 — links sub-resource (4 ops)
 *
 * Bound by the DI container when FHIR_TRANSPORT is "rest" (default).
 * For GraphQL transport, see patient.graphql.service.ts.
 *
 * Environment variables required:
 *  - FHIR_GQL_URL — base URL of the fhir-gql service, e.g. http://localhost:8005
 */

import axios, { AxiosInstance } from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import type { IPatientsService } from "../../domain/interfaces/patient.service.interface";
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
import { PatientCoreRestService } from "./rest/patient.core.rest.service";
import { PatientNamesRestService } from "./rest/patient.names.rest.service";
import { PatientIdentifiersRestService } from "./rest/patient.identifiers.rest.service";
import { PatientTelecomRestService } from "./rest/patient.telecom.rest.service";
import { PatientAddressesRestService } from "./rest/patient.addresses.rest.service";
import { PatientPhotosRestService } from "./rest/patient.photos.rest.service";
import { PatientContactsRestService } from "./rest/patient.contacts.rest.service";
import { PatientCommunicationsRestService } from "./rest/patient.communications.rest.service";
import { PatientGeneralPractitionersRestService } from "./rest/patient.general-practitioners.rest.service";
import { PatientLinksRestService } from "./rest/patient.links.rest.service";

export class PatientRestApiService implements IPatientsService {
  private readonly core: PatientCoreRestService;
  private readonly names: PatientNamesRestService;
  private readonly identifiers: PatientIdentifiersRestService;
  private readonly telecom: PatientTelecomRestService;
  private readonly addresses: PatientAddressesRestService;
  private readonly photos: PatientPhotosRestService;
  private readonly contacts: PatientContactsRestService;
  private readonly communications: PatientCommunicationsRestService;
  private readonly generalPractitioners: PatientGeneralPractitionersRestService;
  private readonly links: PatientLinksRestService;

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    /** Single axios instance shared by all sub-services. */
    const client: AxiosInstance = axios.create({
      baseURL: url,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
      // Follow 307 redirects — fhir-gql emits them for missing trailing slashes.
      maxRedirects: 5,
    });

    /** Request interceptor: attaches a fresh JWT before every outgoing request. */
    client.interceptors.request.use(async (config) => {
      const token = await getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.core = new PatientCoreRestService(client);
    this.names = new PatientNamesRestService(client);
    this.identifiers = new PatientIdentifiersRestService(client);
    this.telecom = new PatientTelecomRestService(client);
    this.addresses = new PatientAddressesRestService(client);
    this.photos = new PatientPhotosRestService(client);
    this.contacts = new PatientContactsRestService(client);
    this.communications = new PatientCommunicationsRestService(client);
    this.generalPractitioners = new PatientGeneralPractitionersRestService(
      client,
    );
    this.links = new PatientLinksRestService(client);
  }

  // ── Core ──────────────────────────────────────────────────────────────────

  /** @inheritdoc */
  create(dto: TCreatePatient): Promise<TPatientResponse> {
    return this.core.create(dto);
  }

  /** @inheritdoc */
  createFull(dto: TCreatePatientFull): Promise<TPatientResponse> {
    return this.core.createFull(dto);
  }

  /** @inheritdoc */
  updateFull(
    id: number,
    dto: TUpdatePatientFullDto,
  ): Promise<TPatientResponse> {
    return this.core.updateFull(id, dto);
  }

  /** @inheritdoc */
  list(query?: TListPatientsQuery): Promise<TPaginatedPatientResponse> {
    return this.core.list(query);
  }

  /** @inheritdoc */
  getMe(): Promise<TPatientResponse> {
    return this.core.getMe();
  }

  /** @inheritdoc */
  getById(id: number): Promise<TPatientResponse> {
    return this.core.getById(id);
  }

  /** @inheritdoc */
  update(id: number, dto: TUpdatePatientDto): Promise<TPatientResponse> {
    return this.core.update(id, dto);
  }

  /** @inheritdoc */
  delete(id: number): Promise<void> {
    return this.core.delete(id);
  }

  // ── Names ─────────────────────────────────────────────────────────────────

  /** @inheritdoc */
  addName(patientId: number, dto: TAddPatientName): Promise<TPatientResponse> {
    return this.names.add(patientId, dto);
  }

  /** @inheritdoc */
  listNames(patientId: number): Promise<TPatientNamesList> {
    return this.names.list(patientId);
  }

  /** @inheritdoc */
  patchName(
    patientId: number,
    itemId: number,
    dto: TPatchPatientName,
  ): Promise<TPatientResponse> {
    return this.names.patch(patientId, itemId, dto);
  }

  /** @inheritdoc */
  deleteName(patientId: number, itemId: number): Promise<void> {
    return this.names.delete(patientId, itemId);
  }

  // ── Identifiers ───────────────────────────────────────────────────────────

  /** @inheritdoc */
  addIdentifier(
    patientId: number,
    dto: TAddPatientIdentifier,
  ): Promise<TPatientResponse> {
    return this.identifiers.add(patientId, dto);
  }

  /** @inheritdoc */
  listIdentifiers(patientId: number): Promise<TPatientIdentifiersList> {
    return this.identifiers.list(patientId);
  }

  /** @inheritdoc */
  patchIdentifier(
    patientId: number,
    itemId: number,
    dto: TPatchPatientIdentifier,
  ): Promise<TPatientResponse> {
    return this.identifiers.patch(patientId, itemId, dto);
  }

  /** @inheritdoc */
  deleteIdentifier(patientId: number, itemId: number): Promise<void> {
    return this.identifiers.delete(patientId, itemId);
  }

  // ── Telecom ───────────────────────────────────────────────────────────────

  /** @inheritdoc */
  addTelecom(
    patientId: number,
    dto: TAddPatientTelecom,
  ): Promise<TPatientResponse> {
    return this.telecom.add(patientId, dto);
  }

  /** @inheritdoc */
  listTelecom(patientId: number): Promise<TPatientTelecomList> {
    return this.telecom.list(patientId);
  }

  /** @inheritdoc */
  patchTelecom(
    patientId: number,
    itemId: number,
    dto: TPatchPatientTelecom,
  ): Promise<TPatientResponse> {
    return this.telecom.patch(patientId, itemId, dto);
  }

  /** @inheritdoc */
  deleteTelecom(patientId: number, itemId: number): Promise<void> {
    return this.telecom.delete(patientId, itemId);
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  /** @inheritdoc */
  addAddress(
    patientId: number,
    dto: TAddPatientAddress,
  ): Promise<TPatientResponse> {
    return this.addresses.add(patientId, dto);
  }

  /** @inheritdoc */
  listAddresses(patientId: number): Promise<TPatientAddressesList> {
    return this.addresses.list(patientId);
  }

  /** @inheritdoc */
  patchAddress(
    patientId: number,
    itemId: number,
    dto: TPatchPatientAddress,
  ): Promise<TPatientResponse> {
    return this.addresses.patch(patientId, itemId, dto);
  }

  /** @inheritdoc */
  deleteAddress(patientId: number, itemId: number): Promise<void> {
    return this.addresses.delete(patientId, itemId);
  }

  // ── Photos ────────────────────────────────────────────────────────────────

  /** @inheritdoc */
  addPhoto(
    patientId: number,
    dto: TAddPatientPhoto,
  ): Promise<TPatientResponse> {
    return this.photos.add(patientId, dto);
  }

  /** @inheritdoc */
  listPhotos(patientId: number): Promise<TPatientPhotosList> {
    return this.photos.list(patientId);
  }

  /** @inheritdoc */
  patchPhoto(
    patientId: number,
    itemId: number,
    dto: TPatchPatientPhoto,
  ): Promise<TPatientResponse> {
    return this.photos.patch(patientId, itemId, dto);
  }

  /** @inheritdoc */
  deletePhoto(patientId: number, itemId: number): Promise<void> {
    return this.photos.delete(patientId, itemId);
  }

  // ── Contacts ──────────────────────────────────────────────────────────────

  /** @inheritdoc */
  addContact(
    patientId: number,
    dto: TAddPatientContact,
  ): Promise<TPatientResponse> {
    return this.contacts.add(patientId, dto);
  }

  /** @inheritdoc */
  listContacts(patientId: number): Promise<TPatientContactsList> {
    return this.contacts.list(patientId);
  }

  /** @inheritdoc */
  patchContact(
    patientId: number,
    itemId: number,
    dto: TPatchPatientContact,
  ): Promise<TPatientResponse> {
    return this.contacts.patch(patientId, itemId, dto);
  }

  /** @inheritdoc */
  deleteContact(patientId: number, itemId: number): Promise<void> {
    return this.contacts.delete(patientId, itemId);
  }

  // ── Communications ────────────────────────────────────────────────────────

  /** @inheritdoc */
  addCommunication(
    patientId: number,
    dto: TAddPatientCommunication,
  ): Promise<TPatientResponse> {
    return this.communications.add(patientId, dto);
  }

  /** @inheritdoc */
  listCommunications(patientId: number): Promise<TPatientCommunicationsList> {
    return this.communications.list(patientId);
  }

  /** @inheritdoc */
  patchCommunication(
    patientId: number,
    itemId: number,
    dto: TPatchPatientCommunication,
  ): Promise<TPatientResponse> {
    return this.communications.patch(patientId, itemId, dto);
  }

  /** @inheritdoc */
  deleteCommunication(patientId: number, itemId: number): Promise<void> {
    return this.communications.delete(patientId, itemId);
  }

  // ── General Practitioners ─────────────────────────────────────────────────

  /** @inheritdoc */
  addGeneralPractitioner(
    patientId: number,
    dto: TAddPatientGP,
  ): Promise<TPatientResponse> {
    return this.generalPractitioners.add(patientId, dto);
  }

  /** @inheritdoc */
  listGeneralPractitioners(
    patientId: number,
  ): Promise<TPatientGeneralPractitionersList> {
    return this.generalPractitioners.list(patientId);
  }

  /** @inheritdoc */
  patchGeneralPractitioner(
    patientId: number,
    itemId: number,
    dto: TPatchPatientGP,
  ): Promise<TPatientResponse> {
    return this.generalPractitioners.patch(patientId, itemId, dto);
  }

  /** @inheritdoc */
  deleteGeneralPractitioner(patientId: number, itemId: number): Promise<void> {
    return this.generalPractitioners.delete(patientId, itemId);
  }

  // ── Links ─────────────────────────────────────────────────────────────────

  /** @inheritdoc */
  addLink(patientId: number, dto: TAddPatientLink): Promise<TPatientResponse> {
    return this.links.add(patientId, dto);
  }

  /** @inheritdoc */
  listLinks(patientId: number): Promise<TPatientLinksList> {
    return this.links.list(patientId);
  }

  /** @inheritdoc */
  patchLink(
    patientId: number,
    itemId: number,
    dto: TPatchPatientLink,
  ): Promise<TPatientResponse> {
    return this.links.patch(patientId, itemId, dto);
  }

  /** @inheritdoc */
  deleteLink(patientId: number, itemId: number): Promise<void> {
    return this.links.delete(patientId, itemId);
  }
}
