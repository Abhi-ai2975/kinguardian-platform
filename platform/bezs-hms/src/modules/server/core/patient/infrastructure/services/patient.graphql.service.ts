/**
 * PatientGraphQLService — GraphQL transport stub for IPatientsService.
 *
 * Layer: infrastructure / services
 * Resource: Patient (FHIR R4)
 * Transport: GraphQL (NOT YET IMPLEMENTED)
 *
 * This stub satisfies the IPatientsService interface so the DI container can
 * bind it when FHIR_TRANSPORT=graphql. Every method throws immediately.
 *
 * To activate: set FHIR_TRANSPORT=graphql in the environment.
 * Default (FHIR_TRANSPORT=rest) uses PatientRestApiService instead.
 */

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
} from "@/modules/entities/schemas/patient";

/** Shared stub error message prefix. */
const NOT_IMPLEMENTED = (method: string) =>
  `PatientGraphQLService.${method} is not yet implemented. Set FHIR_TRANSPORT=rest.`;

export class PatientGraphQLService implements IPatientsService {
  async create(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("create")); }
  async createFull(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("createFull")); }
  async updateFull(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("updateFull")); }
  async list(): Promise<TPaginatedPatientResponse> { throw new Error(NOT_IMPLEMENTED("list")); }
  async getMe(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("getMe")); }
  async getById(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("getById")); }
  async update(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("update")); }
  async delete(): Promise<void> { throw new Error(NOT_IMPLEMENTED("delete")); }

  async addName(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("addName")); }
  async listNames(): Promise<TPatientNamesList> { throw new Error(NOT_IMPLEMENTED("listNames")); }
  async patchName(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("patchName")); }
  async deleteName(): Promise<void> { throw new Error(NOT_IMPLEMENTED("deleteName")); }

  async addIdentifier(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("addIdentifier")); }
  async listIdentifiers(): Promise<TPatientIdentifiersList> { throw new Error(NOT_IMPLEMENTED("listIdentifiers")); }
  async patchIdentifier(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("patchIdentifier")); }
  async deleteIdentifier(): Promise<void> { throw new Error(NOT_IMPLEMENTED("deleteIdentifier")); }

  async addTelecom(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("addTelecom")); }
  async listTelecom(): Promise<TPatientTelecomList> { throw new Error(NOT_IMPLEMENTED("listTelecom")); }
  async patchTelecom(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("patchTelecom")); }
  async deleteTelecom(): Promise<void> { throw new Error(NOT_IMPLEMENTED("deleteTelecom")); }

  async addAddress(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("addAddress")); }
  async listAddresses(): Promise<TPatientAddressesList> { throw new Error(NOT_IMPLEMENTED("listAddresses")); }
  async patchAddress(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("patchAddress")); }
  async deleteAddress(): Promise<void> { throw new Error(NOT_IMPLEMENTED("deleteAddress")); }

  async addPhoto(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("addPhoto")); }
  async listPhotos(): Promise<TPatientPhotosList> { throw new Error(NOT_IMPLEMENTED("listPhotos")); }
  async patchPhoto(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("patchPhoto")); }
  async deletePhoto(): Promise<void> { throw new Error(NOT_IMPLEMENTED("deletePhoto")); }

  async addContact(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("addContact")); }
  async listContacts(): Promise<TPatientContactsList> { throw new Error(NOT_IMPLEMENTED("listContacts")); }
  async patchContact(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("patchContact")); }
  async deleteContact(): Promise<void> { throw new Error(NOT_IMPLEMENTED("deleteContact")); }

  async addCommunication(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("addCommunication")); }
  async listCommunications(): Promise<TPatientCommunicationsList> { throw new Error(NOT_IMPLEMENTED("listCommunications")); }
  async patchCommunication(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("patchCommunication")); }
  async deleteCommunication(): Promise<void> { throw new Error(NOT_IMPLEMENTED("deleteCommunication")); }

  async addGeneralPractitioner(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("addGeneralPractitioner")); }
  async listGeneralPractitioners(): Promise<TPatientGeneralPractitionersList> { throw new Error(NOT_IMPLEMENTED("listGeneralPractitioners")); }
  async patchGeneralPractitioner(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("patchGeneralPractitioner")); }
  async deleteGeneralPractitioner(): Promise<void> { throw new Error(NOT_IMPLEMENTED("deleteGeneralPractitioner")); }

  async addLink(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("addLink")); }
  async listLinks(): Promise<TPatientLinksList> { throw new Error(NOT_IMPLEMENTED("listLinks")); }
  async patchLink(): Promise<TPatientResponse> { throw new Error(NOT_IMPLEMENTED("patchLink")); }
  async deleteLink(): Promise<void> { throw new Error(NOT_IMPLEMENTED("deleteLink")); }
}
