/**
 * PractitionerGraphQLService — GraphQL transport stub.
 *
 * Layer: server / core / practitioner / infrastructure / services
 *
 * Placeholder implementation of IPractitionersService for the GraphQL transport.
 * Not yet implemented. Bound by the DI module when FHIR_TRANSPORT=graphql.
 *
 * Set FHIR_TRANSPORT=rest (default) to use PractitionerRestApiService instead.
 */

import { IPractitionersService } from "../../domain/interfaces/practitioner.service.interface";
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
  TPractitionerPatchDto,
  TListPractitionersQuery,
  TAddPractitionerName,
  TPatchPractitionerNameDto,
  TAddPractitionerIdentifier,
  TPatchPractitionerIdentifierDto,
  TAddPractitionerTelecom,
  TPatchPractitionerTelecomDto,
  TAddPractitionerAddress,
  TPatchPractitionerAddressDto,
  TAddPractitionerPhoto,
  TPatchPractitionerPhotoDto,
  TAddPractitionerQualification,
  TPatchPractitionerQualificationDto,
  TAddPractitionerCommunication,
  TPatchPractitionerCommunicationDto,
} from "@/modules/entities/schemas/practitioner";

/** Stub — every method throws until GraphQL transport is implemented. */
export class PractitionerGraphQLService implements IPractitionersService {
  async create(_dto: TCreatePractitioner): Promise<TPractitionerResponse> {
    throw new Error("PractitionerGraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
  async createFull(): Promise<TPractitionerResponse> {
    throw new Error("PractitionerGraphQLService.createFull is not yet implemented.");
  }
  async updateFull(): Promise<TPractitionerResponse> {
    throw new Error("PractitionerGraphQLService.updateFull is not yet implemented.");
  }
  async list(_query?: TListPractitionersQuery): Promise<TPaginatedPractitionerResponse> {
    throw new Error("PractitionerGraphQLService.list is not yet implemented.");
  }
  async getMe(): Promise<TPractitionerResponse> {
    throw new Error("PractitionerGraphQLService.getMe is not yet implemented.");
  }
  async getById(_id: number): Promise<TPractitionerResponse> {
    throw new Error("PractitionerGraphQLService.getById is not yet implemented.");
  }
  async update(_id: number, _dto: TPractitionerPatchDto): Promise<TPractitionerResponse> {
    throw new Error("PractitionerGraphQLService.update is not yet implemented.");
  }
  async delete(_id: number): Promise<void> {
    throw new Error("PractitionerGraphQLService.delete is not yet implemented.");
  }
  async addName(_pid: number, _dto: TAddPractitionerName): Promise<TPractitionerNameResponse> {
    throw new Error("PractitionerGraphQLService.addName is not yet implemented.");
  }
  async listNames(_pid: number): Promise<TPractitionerNameListResponse> {
    throw new Error("PractitionerGraphQLService.listNames is not yet implemented.");
  }
  async patchName(_pid: number, _id: number, _dto: TPatchPractitionerNameDto): Promise<TPractitionerNameResponse> {
    throw new Error("PractitionerGraphQLService.patchName is not yet implemented.");
  }
  async deleteName(_pid: number, _id: number): Promise<void> {
    throw new Error("PractitionerGraphQLService.deleteName is not yet implemented.");
  }
  async addIdentifier(_pid: number, _dto: TAddPractitionerIdentifier): Promise<TPractitionerIdentifierResponse> {
    throw new Error("PractitionerGraphQLService.addIdentifier is not yet implemented.");
  }
  async listIdentifiers(_pid: number): Promise<TPractitionerIdentifierListResponse> {
    throw new Error("PractitionerGraphQLService.listIdentifiers is not yet implemented.");
  }
  async patchIdentifier(_pid: number, _id: number, _dto: TPatchPractitionerIdentifierDto): Promise<TPractitionerIdentifierResponse> {
    throw new Error("PractitionerGraphQLService.patchIdentifier is not yet implemented.");
  }
  async deleteIdentifier(_pid: number, _id: number): Promise<void> {
    throw new Error("PractitionerGraphQLService.deleteIdentifier is not yet implemented.");
  }
  async addTelecom(_pid: number, _dto: TAddPractitionerTelecom): Promise<TPractitionerTelecomResponse> {
    throw new Error("PractitionerGraphQLService.addTelecom is not yet implemented.");
  }
  async listTelecom(_pid: number): Promise<TPractitionerTelecomListResponse> {
    throw new Error("PractitionerGraphQLService.listTelecom is not yet implemented.");
  }
  async patchTelecom(_pid: number, _id: number, _dto: TPatchPractitionerTelecomDto): Promise<TPractitionerTelecomResponse> {
    throw new Error("PractitionerGraphQLService.patchTelecom is not yet implemented.");
  }
  async deleteTelecom(_pid: number, _id: number): Promise<void> {
    throw new Error("PractitionerGraphQLService.deleteTelecom is not yet implemented.");
  }
  async addAddress(_pid: number, _dto: TAddPractitionerAddress): Promise<TPractitionerAddressResponse> {
    throw new Error("PractitionerGraphQLService.addAddress is not yet implemented.");
  }
  async listAddresses(_pid: number): Promise<TPractitionerAddressListResponse> {
    throw new Error("PractitionerGraphQLService.listAddresses is not yet implemented.");
  }
  async patchAddress(_pid: number, _id: number, _dto: TPatchPractitionerAddressDto): Promise<TPractitionerAddressResponse> {
    throw new Error("PractitionerGraphQLService.patchAddress is not yet implemented.");
  }
  async deleteAddress(_pid: number, _id: number): Promise<void> {
    throw new Error("PractitionerGraphQLService.deleteAddress is not yet implemented.");
  }
  async addPhoto(_pid: number, _dto: TAddPractitionerPhoto): Promise<TPractitionerPhotoResponse> {
    throw new Error("PractitionerGraphQLService.addPhoto is not yet implemented.");
  }
  async listPhotos(_pid: number): Promise<TPractitionerPhotoListResponse> {
    throw new Error("PractitionerGraphQLService.listPhotos is not yet implemented.");
  }
  async patchPhoto(_pid: number, _id: number, _dto: TPatchPractitionerPhotoDto): Promise<TPractitionerPhotoResponse> {
    throw new Error("PractitionerGraphQLService.patchPhoto is not yet implemented.");
  }
  async deletePhoto(_pid: number, _id: number): Promise<void> {
    throw new Error("PractitionerGraphQLService.deletePhoto is not yet implemented.");
  }
  async addQualification(_pid: number, _dto: TAddPractitionerQualification): Promise<TPractitionerQualificationResponse> {
    throw new Error("PractitionerGraphQLService.addQualification is not yet implemented.");
  }
  async listQualifications(_pid: number): Promise<TPractitionerQualificationListResponse> {
    throw new Error("PractitionerGraphQLService.listQualifications is not yet implemented.");
  }
  async patchQualification(_pid: number, _id: number, _dto: TPatchPractitionerQualificationDto): Promise<TPractitionerQualificationResponse> {
    throw new Error("PractitionerGraphQLService.patchQualification is not yet implemented.");
  }
  async deleteQualification(_pid: number, _id: number): Promise<void> {
    throw new Error("PractitionerGraphQLService.deleteQualification is not yet implemented.");
  }
  async addCommunication(_pid: number, _dto: TAddPractitionerCommunication): Promise<TPractitionerCommunicationResponse> {
    throw new Error("PractitionerGraphQLService.addCommunication is not yet implemented.");
  }
  async listCommunications(_pid: number): Promise<TPractitionerCommunicationListResponse> {
    throw new Error("PractitionerGraphQLService.listCommunications is not yet implemented.");
  }
  async patchCommunication(_pid: number, _id: number, _dto: TPatchPractitionerCommunicationDto): Promise<TPractitionerCommunicationResponse> {
    throw new Error("PractitionerGraphQLService.patchCommunication is not yet implemented.");
  }
  async deleteCommunication(_pid: number, _id: number): Promise<void> {
    throw new Error("PractitionerGraphQLService.deleteCommunication is not yet implemented.");
  }
}
